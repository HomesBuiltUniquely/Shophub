# AWS Linux: catalog backend only

ShopHub **frontend** (this Next.js repo) goes on **Vercel**.

AWS Linux only runs the **Spring Boot catalog API** (`/api/v1` on port **8080**) and **MySQL** (`homes_merry`). Design Module and CRM stay on their existing hosts (`api.hubinterior.com`, `hows.hubinterior.com`).

This git repo does **not** contain the Spring project (local path was `Ecom-homes-and-merry`). Build the JAR there, then copy it to EC2.

```
Browser  →  Vercel (Next.js UI + /api/*)
                │
                ├── NEXT_PUBLIC_API_BASE_URL  →  https://api.yourdomain.com/api/v1   (EC2 Spring)
                ├── HOMES_MERRY_DB_*          →  RDS or EC2 MySQL (serverless functions)
                ├── DESIGN_MODULE_*           →  api.hubinterior.com
                └── AWS S3                    →  bucket designmod
```

---

## 1. EC2

- AMI: **Amazon Linux 2023**
- Size: **t3.small** (or larger)
- Region: **ap-south-2** if you already use S3/RDS there
- Security group:
  - `22` SSH from your IP
  - `80` / `443` from the world (Nginx)
  - **Do not** open `8080` or `3306` to `0.0.0.0/0`
- Elastic IP + DNS: e.g. `api.yourdomain.com`

```bash
ssh -i your-key.pem ec2-user@YOUR_PUBLIC_IP
```

---

## 2. Java + Nginx

```bash
sudo dnf update -y
sudo dnf install -y java-17-amazon-corretto nginx tar gzip
java -version
```

Optional MySQL on the same box (skip if using RDS):

```bash
sudo dnf install -y mariadb105-server
sudo systemctl enable --now mariadb
sudo mysql_secure_installation
```

```sql
CREATE DATABASE homes_merry CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'shophub'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';
GRANT ALL ON homes_merry.* TO 'shophub'@'localhost';
FLUSH PRIVILEGES;
```

Import a dump if you have one:

```bash
mysql -u shophub -p homes_merry < homes_merry.sql
```

---

## 3. Spring Boot JAR

On your machine (the Spring repo):

```bash
./mvnw clean package -DskipTests
# or: ./gradlew bootJar
scp -i your-key.pem target/*.jar ec2-user@YOUR_PUBLIC_IP:/tmp/shophub-api.jar
```

On EC2:

```bash
sudo useradd -r -s /sbin/nologin shophub || true
sudo mkdir -p /opt/shophub /etc/shophub
sudo mv /tmp/shophub-api.jar /opt/shophub/app.jar
sudo chown -R shophub:shophub /opt/shophub
```

`/etc/shophub/app.env` (mode `600`, not in git):

```bash
SERVER_PORT=8080
SERVER_ADDRESS=127.0.0.1

SPRING_DATASOURCE_URL=jdbc:mysql://127.0.0.1:3306/homes_merry?useSSL=false&allowPublicKeyRetrieval=true
SPRING_DATASOURCE_USERNAME=shophub
SPRING_DATASOURCE_PASSWORD=STRONG_PASSWORD

# CORS — your Vercel URL(s)
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,https://yourdomain.com
```

Property names must match your Spring `application.yml`. If the project uses `spring.datasource.*` only, keep those names.

If MySQL is **RDS**, put the RDS endpoint in `SPRING_DATASOURCE_URL` and allow the EC2 security group on RDS port 3306.

---

## 4. systemd

`/etc/systemd/system/shophub-api.service`:

```ini
[Unit]
Description=ShopHub Spring catalog API
After=network.target

[Service]
Type=simple
User=shophub
EnvironmentFile=/etc/shophub/app.env
WorkingDirectory=/opt/shophub
ExecStart=/usr/bin/java -jar /opt/shophub/app.jar
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now shophub-api
sudo journalctl -u shophub-api -f
curl -s http://127.0.0.1:8080/api/v1/categories/getAllCategories | head
```

---

## 5. Nginx + TLS (public HTTPS)

Bind Spring to **localhost only**. Nginx terminates HTTPS.

`/etc/nginx/conf.d/shophub-api.conf`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t
sudo systemctl enable --now nginx
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

Vercel then calls `https://api.yourdomain.com/api/v1/...`.

---

## 6. CORS

The browser (Vercel origin) will call this API. Enable CORS on Spring for:

- `https://your-app.vercel.app`
- custom domain if you add one

Allow `GET, POST, PUT, PATCH, DELETE, OPTIONS` and headers `Authorization`, `Content-Type`.

---

## 7. Vercel (frontend) env

On the Vercel project for **this** repo, set:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_API_BEARER_TOKEN=
SPRING_AUTH_USERNAME=
SPRING_AUTH_PASSWORD=

HOMES_MERRY_DB_HOST=your-rds-or-mysql-host
HOMES_MERRY_DB_PORT=3306
HOMES_MERRY_DB_USER=shophub
HOMES_MERRY_DB_PASSWORD=
HOMES_MERRY_DB_NAME=homes_merry

CRM_API_PROXY_TARGET=https://hows.hubinterior.com
ERP_API_BASE_URL=https://hows.hubinterior.com
ERP_AUTH_TOKEN=

DESIGN_MODULE_BASE_URL=https://api.hubinterior.com
DESIGN_MODULE_TOKEN=
DESIGN_MODULE_FRONTEND_URL=https://design.hubinterior.com
NEXT_PUBLIC_DESIGN_MODULE_FRONTEND_URL=https://design.hubinterior.com
HUB_CRM_QUOTE_BASE_URL=https://api.hubinterior.com
EXTERNAL_LEAD_INGEST_API_KEY=hi

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-2
S3_BUCKET_NAME=designmod
S3_KEY_PREFIX=shophub
```

Redeploy after changing `NEXT_PUBLIC_*`.

If Vercel serverless functions talk to MySQL, RDS must allow the Vercel IP range **or** you put MySQL only behind Spring and stop using direct DB from Next (today some Next API routes still use `homes_merry` directly).

---

## 8. Update the JAR

```bash
scp -i your-key.pem target/*.jar ec2-user@YOUR_PUBLIC_IP:/tmp/shophub-api.jar
sudo mv /tmp/shophub-api.jar /opt/shophub/app.jar
sudo chown shophub:shophub /opt/shophub/app.jar
sudo systemctl restart shophub-api
```

---

## 9. Checklist

- [ ] `curl -I https://api.yourdomain.com/api/v1/categories/getAllCategories` works
- [ ] Vercel `NEXT_PUBLIC_API_BASE_URL` points at that HTTPS URL (not `localhost:8080`)
- [ ] CORS allows the Vercel origin
- [ ] `8080` and `3306` are not public
- [ ] Catalog pages on Vercel load products/brands from the AWS API
