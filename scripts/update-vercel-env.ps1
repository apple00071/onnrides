# Update Vercel Environment Variables
Write-Host "Updating Vercel Environment Variables..."

# Set NEXTAUTH_URL
Write-Host "Setting NEXTAUTH_URL..."
echo "https://onnrides-5pch0m96n-pavan-d22c1a3d.vercel.app" | vercel env add NEXTAUTH_URL production

# Set ADMIN_PHONE
Write-Host "Setting ADMIN_PHONE..."
echo "919182495481" | vercel env add ADMIN_PHONE production

# Set CRON_SECRET
Write-Host "Setting CRON_SECRET..."
echo "onnrides-whatsapp-cron-secret-2025" | vercel env add CRON_SECRET production

Write-Host "Environment variables updated successfully!"
