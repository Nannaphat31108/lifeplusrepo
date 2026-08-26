# Deploy to GitHub + Render + Custom Domain

## 1) GitHub
Create an empty GitHub repository, then in this project folder:

```powershell
git init
git add .
git commit -m "Initial ERP deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Do not upload `.env`, `venv`, or local SQLite database files. `.gitignore` already excludes them.

## 2) Render using Blueprint
In Render:
1. New > Blueprint.
2. Connect the GitHub repository.
3. Render detects `render.yaml`.
4. Approve creation of:
   - `rd-erp-ai` Web Service
   - `rd-erp-postgres` PostgreSQL database
5. Wait for deployment to finish.
6. Open the generated `https://...onrender.com` URL.
7. Verify `/health` and `/login-check`.

The service command is:

`python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## 3) Custom domain
After buying/owning a domain:
1. Render > Web Service > Settings > Custom Domains.
2. Add the root domain, such as `yourcompany.com`, or `erp.yourcompany.com`.
3. Render shows the DNS record(s) to add.
4. Add those records at your DNS provider.
5. Return to Render and click Verify.

Render automatically provisions HTTPS/TLS for verified custom domains.

## Production note
The Render deployment uses PostgreSQL instead of the local SQLite database.
This prevents ERP data from being lost when Render restarts/redeploys.
