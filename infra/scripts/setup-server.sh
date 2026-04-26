#!/usr/bin/env bash
# VPS initial setup: Hub Europe, IP 213.136.67.218, Ubuntu 24.04
# Run once as root after first SSH login.
set -euo pipefail

echo "=== TrendyWheels VPS Setup ==="
echo "Target: 213.136.67.218 (Hub Europe, Ubuntu 24.04)"

# ─── F1: Server hardening ───────────────────────────────────────
echo ""
echo "=== F1: Hardening server ==="

apt-get update -y && apt-get upgrade -y

# Firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

# Fail2ban
apt-get install -y fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port    = 22
EOF
systemctl enable fail2ban
systemctl start fail2ban

# Create deploy user (no root SSH)
if ! id deploy &>/dev/null; then
  adduser --disabled-password --gecos "" deploy
  usermod -aG sudo deploy
  mkdir -p /home/deploy/.ssh
  # Copy root's authorized_keys so SSH key login still works
  cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys 2>/dev/null || true
  chown -R deploy:deploy /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
  chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
fi

# Disable root SSH login after deploy user is confirmed
sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh

echo "✓ Server hardened"

# ─── F2: Node.js 20 + pnpm + PM2 ───────────────────────────────
echo ""
echo "=== F2: Installing Node.js 20 + pnpm + PM2 ==="

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version
npm --version

npm install -g pnpm pm2
pnpm --version
pm2 --version

# Create log directory
mkdir -p /var/log/trendywheels
chown deploy:deploy /var/log/trendywheels

# PM2 startup
pm2 startup ubuntu -u deploy --hp /home/deploy
echo "✓ Node.js + pnpm + PM2 installed"

# ─── F3: PostgreSQL 16 + Redis 7 ───────────────────────────────
echo ""
echo "=== F3: Installing PostgreSQL 16 + Redis 7 ==="

# PostgreSQL 16
apt-get install -y postgresql-16
systemctl enable postgresql
systemctl start postgresql

# Create database and user
sudo -u postgres psql << 'PSQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'trendywheels') THEN
    CREATE USER trendywheels WITH PASSWORD 'TW_PG_CHANGE_ME_2024';
  END IF;
END
$$;
CREATE DATABASE trendywheels OWNER trendywheels;
\c trendywheels
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO trendywheels;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO trendywheels;
PSQL

echo "✓ PostgreSQL configured"

# Redis 7
apt-get install -y redis-server

# Configure Redis
cat > /etc/redis/redis.conf.d/trendywheels.conf << 'EOF'
requirepass TW_REDIS_CHANGE_ME_2024
maxmemory 256mb
maxmemory-policy allkeys-lru
bind 127.0.0.1
EOF

systemctl enable redis-server
systemctl restart redis-server
echo "✓ Redis configured"

# ─── F4: Docker (MinIO + Plausible) ─────────────────────────────
echo ""
echo "=== F4: Installing Docker ==="

apt-get install -y ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

usermod -aG docker deploy
systemctl enable docker

echo "Starting MinIO + Plausible via Docker Compose..."
cd /opt/trendywheels
docker compose -f infra/docker-compose.yml up -d
echo "✓ Docker + MinIO started"

# ─── F5: Nginx + Certbot ────────────────────────────────────────
echo ""
echo "=== F5: Installing Nginx + Certbot ==="

apt-get install -y nginx certbot python3-certbot-nginx

# Copy our nginx config
cp /opt/trendywheels/infra/nginx/trendywheels.conf /etc/nginx/sites-available/trendywheels
ln -sf /etc/nginx/sites-available/trendywheels /etc/nginx/sites-enabled/trendywheels
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl start nginx

echo ""
echo "=== SSL Certificate (Certbot) ==="
echo "Run the following command to get SSL certificates:"
echo ""
echo "certbot --nginx \\"
echo "  -d api.trendywheelseg.com \\"
echo "  -d admin.trendywheelseg.com \\"
echo "  -d support.trendywheelseg.com \\"
echo "  -d inventory.trendywheelseg.com \\"
echo "  -d cdn.trendywheelseg.com \\"
echo "  -d analytics.trendywheelseg.com \\"
echo "  --non-interactive --agree-tos -m admin@trendywheelseg.com"
echo ""
echo "✓ Nginx installed (SSL cert command printed above)"

# ─── Clone & install app ─────────────────────────────────────────
echo ""
echo "=== Cloning repository ==="
cd /opt
git clone https://github.com/REPLACE_WITH_OWNER/trendywheels.git trendywheels 2>/dev/null || \
  (cd /opt/trendywheels && git pull)
chown -R deploy:deploy /opt/trendywheels

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Set passwords in /opt/trendywheels/apps/api/.env"
echo "2. Run: certbot --nginx [domains above]"
echo "3. Run: /opt/trendywheels/infra/scripts/deploy.sh"
echo "4. Check: pm2 list"
