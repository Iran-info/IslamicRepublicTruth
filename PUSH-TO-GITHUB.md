# Push this project to GitHub from PowerShell

Target repository:
`https://github.com/Iran-info/IslamicRepublicTruth`

Your `C:\Dev\IranArticles` folder already has an initialized Git repository and
an `origin` remote. Do not run `git clone` inside it again.

1. Extract every file and folder from the ZIP directly into:

   ```text
   C:\Dev\IranArticles
   ```

   After extraction, `package.json`, `README.md`, `app`, `lib`, and the other
   project files must be directly inside `IranArticles`, not inside an extra
   nested folder.

2. Run these commands in PowerShell:

   ```powershell
   cd C:\Dev\IranArticles

   Get-ChildItem -Force
   git status
   git remote set-url origin https://github.com/Iran-info/IslamicRepublicTruth.git
   git branch -M main

   git config user.name "Iran-info"
   git config user.email "314468457+Iran-info@users.noreply.github.com"

   git add .
   git status
   git commit -m "Initial Azad Journal website"
   git push -u origin main
   ```

3. Complete GitHub authentication only in the browser or terminal prompt on
   your own computer. Never paste a password, personal access token, or device
   code into chat.

The earlier `src refspec main does not match any` message occurred because the
folder had no files and therefore no commit. Once the ZIP contents are
extracted and the commit succeeds, the push command will have a valid `main`
branch to upload.
