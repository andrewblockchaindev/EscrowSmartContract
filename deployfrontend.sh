rsync -r src/ docs/
rsync -r build/contracts/ docs/
git add .
git commit -m "adding frontend files to Github pages"
git push
