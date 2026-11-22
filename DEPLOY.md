# Deploy checklist (about 15 minutes)

## 1. Domain
Buy one (porkbun.com, namecheap.com, GoDaddy India with UPI, or vercel.com/domains). Write it down, e.g. `advitals.xyz`.

## 2. GitHub (about 3 min)
1. Go to github.com/new. Name it `advitals`, set it to **Public**, and don't add a README. Click **Create repository**.
2. On the next page, click **"uploading an existing file"**.
3. Unzip `advitals.zip` and open the `advitals` folder in Finder.
4. Press **Cmd + Shift + .** to show hidden files (.github, .gitignore and .env.example need to go up too).
5. Press **Cmd + A**, drag everything into the GitHub upload box, then click **Commit changes**.

## 3. Vercel (about 3 min)
1. Go to vercel.com, sign up with GitHub, then **Add New → Project** and **Import** `advitals`.
2. Open **Environment Variables** and add `NEXT_PUBLIC_SITE_URL` = `https://your-domain` (no trailing slash).
3. Click **Deploy** and wait about a minute.

## 4. Connect the domain (about 5 min)
1. In Vercel, go to **Project → Settings → Domains** and add your domain. Accept adding `www` too.
2. Vercel shows the DNS records it needs, usually an **A** record for `@` and a **CNAME** for `www`. Copy them exactly.
3. At your registrar, open **DNS settings** for the domain, add those records and delete any default "parking" records.
4. Wait for Vercel to show **Valid Configuration**. This is usually minutes, at most a few hours.
   (If you bought the domain in Vercel, skip this step.)

## 5. Bonus points (about 10 min, optional)
- **Microsoft Clarity:** at clarity.microsoft.com, create a new project for your domain and copy the Project ID. In Vercel, add an environment variable `NEXT_PUBLIC_CLARITY_ID`, then go to **Deployments → ⋯ → Redeploy**.
- **Google Search Console:** at search.google.com/search-console, add a **Domain** property, add the TXT record it gives you at your registrar and click **Verify**. Then go to **Sitemaps** and submit `sitemap.xml`.
- **Real users:** share the sample report link in your batch WhatsApp groups and on LinkedIn so Clarity records visits.

## 6. Submit on Shipped.money
- GitHub: `https://github.com/<your-username>/advitals`
- Live product: `https://your-domain`
