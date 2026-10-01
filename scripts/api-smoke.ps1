# Travel & Visa Agency ERP - API smoke test (plan section F)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/api-smoke.ps1
param(
  [string]$BaseUrl = 'http://localhost:4000/api/v1',
  [string]$AdminEmail = 'admin@travelcrm.com',
  [string]$AdminPassword = 'Admin@123456',
  [string]$StaffPassword = 'Staff@123456'
)
$ErrorActionPreference = 'Stop'
$script:pass = 0
$script:fail = 0
$script:failures = @()

function Check($name, $cond, $detail = '') {
  if ($cond) { $script:pass++; Write-Host "PASS  $name" -ForegroundColor DarkGreen }
  else {
    $script:fail++; $script:failures += $name
    Write-Host "FAIL  $name  $detail" -ForegroundColor Red
  }
}

function Api($method, $path, $body = $null, $token = $null) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  try {
    if ($null -ne $body) {
      $json = ConvertTo-Json -InputObject $body -Depth 12
      $resp = Invoke-WebRequest -UseBasicParsing -Method $method -Uri "$BaseUrl$path" -ContentType 'application/json' -Headers $headers -Body $json
    } else {
      $resp = Invoke-WebRequest -UseBasicParsing -Method $method -Uri "$BaseUrl$path" -Headers $headers
    }
    $j = $null
    if ($resp.Content) { try { $j = $resp.Content | ConvertFrom-Json } catch {} }
    return @{ status = [int]$resp.StatusCode; json = $j }
  } catch {
    $status = 0; $text = ''
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $text = $sr.ReadToEnd()
      } catch {}
    }
    $j = $null
    if ($text) { try { $j = $text | ConvertFrom-Json } catch {} }
    return @{ status = $status; json = $j; text = $text }
  }
}

function Total($r) { return $r.json.pagination.total }
function Row($r) { return $r.json.data }
function Detail($r) { if ($r.text) { return $r.text.Substring(0, [Math]::Min(200, $r.text.Length)) } return "status=$($r.status)" }
function FutureIso($days) { return (Get-Date).ToUniversalTime().AddDays($days).ToString('yyyy-MM-ddTHH:mm:ssZ') }

Write-Host "=== API SMOKE :: $BaseUrl ===" -ForegroundColor Cyan

# ---------- 0. auth ----------
$anon = Api GET '/customers'
Check 'unauthenticated request rejected (401)' ($anon.status -eq 401) (Detail $anon)

$login = Api POST '/auth/login' @{ email = $AdminEmail; password = $AdminPassword }
$admin = $login.json.data.accessToken
Check 'admin login' ([bool]$admin) (Detail $login)
if (-not $admin) { Write-Host 'Cannot continue without admin token' -ForegroundColor Red; exit 1 }

# ---------- 1. module happy paths (seeded data present) ----------
$listModules = @(
  'customers', 'leads', 'follow-ups',
  'countries', 'visa-types', 'applications', 'appointments',
  'suppliers', 'agents',
  'flights', 'hotels', 'packages', 'bookings',
  'quotations', 'invoices', 'payments', 'expenses', 'commissions',
  'documents', 'communications'
)
foreach ($m in $listModules) {
  $r = Api GET "/$m`?limit=1" $null $admin
  Check "list /$m returns seeded rows" ($r.status -eq 200 -and (Total $r) -gt 0) "status=$($r.status) total=$(Total $r)"
}
foreach ($m in @('users', 'roles', 'currencies')) {
  $r = Api GET "/$m" $null $admin
  $cnt = if ($r.json.data.Count) { $r.json.data.Count } else { 0 }
  Check "list /$m returns seeded rows" ($r.status -eq 200 -and $cnt -gt 0) "status=$($r.status) count=$cnt"
}

$dash = Api GET '/dashboard' $null $admin
Check 'dashboard returns KPIs' ($dash.status -eq 200 -and $dash.json.data.kpis.totalCustomers -ge 1 -and $dash.json.data.revenueTrend.Count -ge 1) (Detail $dash)

foreach ($t in @('revenue', 'pipeline', 'receivables', 'bookings', 'expenses', 'commissions')) {
  $r = Api GET "/reports/$t" $null $admin
  Check "report /$t renders" ($r.status -eq 200 -and $r.json.data.columns.Count -ge 2) (Detail $r)
}

# ---------- 2. FLOW: lead -> convert -> customer ----------
$lead = Api POST '/leads' @{ firstName = 'SMOK-Lead'; lastName = 'Smoke'; phone = '+19990000101'; source = 'WEBSITE' } $admin
$leadId = (Row $lead).id
Check 'lead created with LD- number' ($lead.status -eq 201 -and (Row $lead).leadNumber -match '^LD-\d{6}$') (Detail $lead)

$conv = Api POST "/leads/$leadId/convert" @{} $admin
$custFromLead = (Row $conv).customerId
if (-not $custFromLead) { $custFromLead = (Row $conv).convertedCustomerId }
Check 'lead convert 200/201' ($conv.status -eq 200 -or $conv.status -eq 201) (Detail $conv)

$custId = $custFromLead
if (-not $custId) {
  $c = Api POST '/customers' @{ firstName = 'SMOK-Cust'; lastName = 'Smoke'; phone = '+19990000102' } $admin
  $custId = (Row $c).id
}
$custCheck = Api GET "/customers/$custId" $null $admin
Check 'converted customer exists' ($custCheck.status -eq 200) (Detail $custCheck)
if (-not $custId) { Write-Host 'No customer available - aborting flows' -ForegroundColor Red; exit 1 }

# ---------- 3. FLOW: application status walk incl. one illegal transition ----------
$vt = Api GET '/visa-types?limit=1' $null $admin
$visaTypeId = (Row $vt)[0].id
$app = Api POST '/applications' @{ customerId = $custId; visaTypeId = $visaTypeId; applicantCount = 1; totalFees = '250.00' } $admin
$appId = (Row $app).id
Check 'application created DRAFT with APP- number' ($app.status -eq 201 -and (Row $app).status -eq 'DRAFT' -and (Row $app).applicationNumber -match '^APP-\d{6}$') (Detail $app)

$bad = Api PATCH "/applications/$appId/status" @{ status = 'APPROVED' } $admin
Check 'illegal DRAFT->APPROVED rejected (400)' ($bad.status -eq 400) (Detail $bad)

$walkOk = $true; $walkErr = ''
foreach ($s in @('SUBMITTED', 'UNDER_REVIEW', 'AT_EMBASSY', 'APPROVED')) {
  $st = Api PATCH "/applications/$appId/status" @{ status = $s; note = 'smoke' } $admin
  if ($st.status -ne 200) { $walkOk = $false; $walkErr = "at $s : $(Detail $st)"; break }
}
Check 'legal walk DRAFT->...->APPROVED' $walkOk $walkErr
$finalApp = Api GET "/applications/$appId" $null $admin
Check 'application now APPROVED with decisionDate' ((Row $finalApp).status -eq 'APPROVED' -and (Row $finalApp).decisionDate) (Detail $finalApp)
$tl = Api GET "/applications/$appId/timeline" $null $admin
Check 'timeline has >=5 events' ($tl.status -eq 200 -and (Row $tl).Count -ge 5) "count=$((Row $tl).Count)"

# follow-up + appointment quick creates
$fu = Api POST '/follow-ups' @{ subject = 'SMOK follow up'; scheduledAt = (FutureIso 2); customerId = $custId; channel = 'CALL'; priority = 'HIGH' } $admin
$fuId = (Row $fu).id
Check 'follow-up created' ($fu.status -eq 201) (Detail $fu)
$fuDone = Api PATCH "/follow-ups/$fuId/complete" @{} $admin
Check 'follow-up completed' ($fuDone.status -eq 200 -and (Row $fuDone).status -eq 'COMPLETED') (Detail $fuDone)

$apt = Api POST '/appointments' @{ subject = 'SMOK biometrics'; type = 'BIOMETRICS'; scheduledAt = (FutureIso 3); applicationId = $appId; location = 'VFS Dubai'; durationMinutes = 30 } $admin
$aptId = (Row $apt).id
Check 'appointment created inheriting customer' ($apt.status -eq 201 -and (Row $apt).customerId) (Detail $apt)

$comlog = Api POST '/communications' @{ customerId = $custId; channel = 'WHATSAPP'; direction = 'OUTBOUND'; subject = 'SMOK visa update'; body = 'Smoke test message' } $admin
Check 'communication logged' ($comlog.status -eq 201) (Detail $comlog)

# ---------- 4. FLOW: quotation -> invoice -> payment -> refund ----------
$qt = Api POST '/quotations' @{
  customerId = $custId
  discount   = 10; tax = 5
  items      = @(
    @{ itemType = 'PACKAGE'; description = 'SMOK Umrah 14N'; quantity = 2; unitPrice = 450 },
    @{ itemType = 'VISA';    description = 'SMOK visa fee';   quantity = 1; unitPrice = 120.5 }
  )
} $admin
$qtId = (Row $qt).id
Check 'quotation created QT- with server totals' ($qt.status -eq 201 -and (Row $qt).quotationNumber -match '^QT-\d{6}$' -and [double](Row $qt).totalAmount -eq 1015.5) (Detail $qt)

$sent = Api PATCH "/quotations/$qtId/status" @{ status = 'SENT' } $admin
Check 'quotation DRAFT->SENT' ($sent.status -eq 200) (Detail $sent)
$acc = Api PATCH "/quotations/$qtId/status" @{ status = 'ACCEPTED' } $admin
Check 'quotation SENT->ACCEPTED' ($acc.status -eq 200) (Detail $acc)
$conv2 = Api POST "/quotations/$qtId/convert" @{} $admin
$inv = Row $conv2
$invId = $inv.id
Check 'quotation converted to invoice' ($conv2.status -eq 201 -and $inv.invoiceNumber -match '^INV-\d{6}$' -and [double]$inv.totalAmount -eq 1015.5) (Detail $conv2)

$invSent = Api POST "/invoices/$invId/send" @{} $admin
Check 'invoice send -> SENT' ($invSent.status -eq 200 -and (Row $invSent).status -eq 'SENT') (Detail $invSent)

$pay = Api POST '/payments' @{ invoiceId = $invId; amount = 1015.5; method = 'BANK_TRANSFER'; reference = 'SMOK-BT-001' } $admin
$payId = (Row $pay).id
Check 'full payment recorded PAY-' ($pay.status -eq 201 -and (Row $pay).paymentNumber -match '^PAY-\d{6}$') (Detail $pay)
$invPaid = Api GET "/invoices/$invId" $null $admin
Check 'invoice PAID, balance 0' ((Row $invPaid).status -eq 'PAID' -and [double](Row $invPaid).balanceDue -eq 0) (Detail $invPaid)

$overRefund = Api POST "/payments/$payId/refund" @{ amount = 5000 } $admin
Check 'refund larger than payment rejected (400)' ($overRefund.status -eq 400) (Detail $overRefund)
$refund = Api POST "/payments/$payId/refund" @{} $admin
Check 'full refund recorded' ($refund.status -eq 201 -and (Row $refund).isRefund -eq $true) (Detail $refund)
$invAfter = Api GET "/invoices/$invId" $null $admin
Check 'invoice paidAmount back to 0 after refund' ([double](Row $invAfter).paidAmount -eq 0) (Detail $invAfter)

# expense quick pass
$sup = Api POST '/suppliers' @{ name = 'SMOK Supplier'; type = 'OTHER'; email = 'smoksupp@example.com'; phone = '+15559990501' } $admin
$supId = (Row $sup).id
$exp = Api POST '/expenses' @{ category = 'Office Supplies'; title = 'SMOK printer paper'; supplierId = $supId; amount = 42.5; paymentMethod = 'CASH' } $admin
$expId = (Row $exp).id
Check 'expense created PENDING EXP-' ($exp.status -eq 201 -and (Row $exp).expenseNumber -match '^EXP-\d{6}$' -and (Row $exp).status -eq 'PENDING') (Detail $exp)
$expApp = Api PATCH "/expenses/$expId/status" @{ status = 'APPROVED' } $admin
Check 'expense approved' ($expApp.status -eq 200 -and (Row $expApp).status -eq 'APPROVED') (Detail $expApp)

# ---------- 5. FLOW: booking -> confirm -> commission -> approve -> pay ----------
$ag = Api POST '/agents' @{ name = 'SMOK Agent'; commissionType = 'PERCENTAGE'; commissionRate = 5; email = 'smokagent@example.com'; phone = '+15559990500' } $admin
$agId = (Row $ag).id
Check 'agent created' ($ag.status -eq 201) (Detail $ag)

$bk = Api POST '/bookings' @{
  customerId = $custId; type = 'MIXED'; currencyCode = 'USD'
  items = @(
    @{ itemType = 'FLIGHT'; description = 'SMOK KHI-DXB return'; quantity = 2; unitPrice = 300.5 },
    @{ itemType = 'HOTEL';  description = 'SMOK 4N deluxe';      quantity = 1; unitPrice = 99.99 }
  )
} $admin
$bkId = (Row $bk).id
Check 'booking created with server totals (700.99)' ($bk.status -eq 201 -and [double](Row $bk).totalAmount -eq 700.99) (Detail $bk)
$bkConf = Api PATCH "/bookings/$bkId/status" @{ status = 'CONFIRMED' } $admin
Check 'booking DRAFT->CONFIRMED' ($bkConf.status -eq 200 -and (Row $bkConf).status -eq 'CONFIRMED') (Detail $bkConf)

$gen = Api POST '/commissions/generate' @{ bookingId = $bkId; agentId = $agId } $admin
$comId = (Row $gen).id
Check 'commission generated COM- 5% of 700.99 = 35.05' ($gen.status -eq 201 -and (Row $gen).commissionNumber -match '^COM-\d{6}$' -and [double](Row $gen).amount -eq 35.05) (Detail $gen)
$genDup = Api POST '/commissions/generate' @{ bookingId = $bkId; agentId = $agId } $admin
Check 'duplicate commission blocked (409)' ($genDup.status -eq 409) (Detail $genDup)
$comApp = Api PATCH "/commissions/$comId/status" @{ status = 'APPROVED' } $admin
Check 'commission PENDING->APPROVED' ($comApp.status -eq 200 -and (Row $comApp).approvedAt) (Detail $comApp)
$comPay = Api PATCH "/commissions/$comId/status" @{ status = 'PAID' } $admin
Check 'commission APPROVED->PAID' ($comPay.status -eq 200 -and (Row $comPay).paidAt) (Detail $comPay)

# ---------- 6. FLOW: document upload -> verify -> download byte-compare ----------
$pdf = Join-Path $env:TEMP 'smoke-doc.pdf'
[byte[]]$pdfBytes = 0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A,0x25,0xE2,0xE3,0xCF,0xD3,0x0A
[System.IO.File]::WriteAllBytes($pdf, $pdfBytes)
$jsonOut = & curl.exe -s -X POST -H "Authorization: Bearer $admin" -F "file=@$pdf;type=application/pdf" -F "title=SMOK passport" -F "type=PASSPORT" -F "customerId=$custId" "$BaseUrl/documents"
$doc = $jsonOut | ConvertFrom-Json
$docId = $doc.data.id
Check 'document uploaded (multipart, 201)' ($doc.success -eq $true -and $docId -and $doc.data.fileName) "resp=$($jsonOut.Substring(0,[Math]::Min(200,"$jsonOut".Length)))"
$verify = Api PATCH "/documents/$docId/status" @{ status = 'VERIFIED' } $admin
Check 'document verified' ($verify.status -eq 200 -and (Row $verify).status -eq 'VERIFIED') (Detail $verify)
$pdfOut = Join-Path $env:TEMP 'smoke-doc-downloaded.pdf'
& curl.exe -s -f -H "Authorization: Bearer $admin" -o $pdfOut "$BaseUrl/documents/$docId/download" | Out-Null
$hashA = (Get-FileHash $pdf -Algorithm SHA256).Hash
$hashB = if (Test-Path $pdfOut) { (Get-FileHash $pdfOut -Algorithm SHA256).Hash } else { '' }
Check 'downloaded bytes match upload' ($hashA -eq $hashB -and $hashB -ne '') "sent=$hashA got=$hashB"
$docDel = Api DELETE "/documents/$docId" $null $admin
Check 'document deleted' ($docDel.status -eq 200) (Detail $docDel)

# ---------- 7. audit rows present ----------
$audit = Api GET '/audit-logs?limit=5' $null $admin
Check 'audit log has rows' ($audit.status -eq 200 -and (Total $audit) -gt 0) "status=$($audit.status) total=$(Total $audit)"
$auditRecent = (Row $audit) | Where-Object { "$($_.action)$($_.entity)$(($_ | ConvertTo-Json -Depth 4 -Compress))" -match 'SMOK|Lead|Quotation|Payment|Document' } | Select-Object -First 1
Check 'audit recorded recent smoke mutations' ($auditRecent) 'no matching recent rows'

# ---------- 8. role gating + branch scoping ----------
function StaffLogin($email) {
  $r = Api POST '/auth/login' @{ email = $email; password = $StaffPassword }
  return $r.json.data.accessToken
}

$sana = StaffLogin 'sana.sales@travelcrm.com'
Check 'SALES_AGENT login (sana.sales)' ([bool]$sana)
if ($sana) {
  $r = Api GET '/expenses' $null $sana
  Check 'sales denied /expenses (403)' ($r.status -eq 403) (Detail $r)
  $r = Api GET '/customers?limit=200' $null $sana
  $branches = @((Row $r) | Select-Object -ExpandProperty branchId -Unique)
  Check 'sales sees only own branch customers' ($r.status -eq 200 -and $branches.Count -eq 1 -and (Total $r) -gt 0) "branches=$($branches.Count) total=$(Total $r)"
  $r = Api GET '/leads?limit=1' $null $sana
  Check 'sales allowed /leads' ($r.status -eq 200) (Detail $r)
}

$omar = StaffLogin 'omar.sales@travelcrm.com'
if ($sana -and $omar) {
  $bSana = ((Api GET '/customers?limit=200' $null $sana).json.data | Select-Object -ExpandProperty branchId -Unique)[0]
  $bOmar = ((Api GET '/customers?limit=200' $null $omar).json.data | Select-Object -ExpandProperty branchId -Unique)[0]
  Check 'HQ and KHI sales see different branches' ($bSana -and $bOmar -and $bSana -ne $bOmar) "sana=$bSana omar=$bOmar"
}

$ayesha = StaffLogin 'ayesha.visa@travelcrm.com'
Check 'VISA_OFFICER login (ayesha.visa)' ([bool]$ayesha)
if ($ayesha) {
  $r = Api GET '/invoices' $null $ayesha
  Check 'visa officer denied /invoices (403)' ($r.status -eq 403) (Detail $r)
  $r = Api GET '/applications?limit=1' $null $ayesha
  Check 'visa officer allowed /applications' ($r.status -eq 200) (Detail $r)
}

$junaid = StaffLogin 'junaid.accounts@travelcrm.com'
Check 'ACCOUNTANT login (junaid.accounts)' ([bool]$junaid)
if ($junaid) {
  $r = Api GET '/leads' $null $junaid
  Check 'accountant denied /leads (403)' ($r.status -eq 403) (Detail $r)
  $r = Api GET '/invoices?limit=1' $null $junaid
  Check 'accountant allowed /invoices' ($r.status -eq 200) (Detail $r)
  $r = Api POST '/payments' @{ invoiceId = [guid]::NewGuid().ToString(); amount = 1 } $junaid
  Check 'accountant bad invoice reference rejected' ($r.status -ge 400) (Detail $r)
}

$nimat = StaffLogin 'nimat.docs@travelcrm.com'
Check 'DOCUMENT_OFFICER login (nimat.docs)' ([bool]$nimat)
if ($nimat) {
  $r = Api GET '/documents?limit=1' $null $nimat
  Check 'docs officer allowed /documents' ($r.status -eq 200) (Detail $r)
  $r = Api GET '/bookings' $null $nimat
  Check 'docs officer denied /bookings (403)' ($r.status -eq 403) (Detail $r)
}

$badpw = Api POST '/auth/login' @{ email = 'sana.sales@travelcrm.com'; password = 'WrongPass123' }
Check 'wrong staff password rejected' ($badpw.status -eq 401 -or $badpw.status -eq 400) (Detail $badpw)

# ---------- 8b. flight-fare subsystem (Agency Fare & Ticket Counter) ----------
# The suite has issued >100 requests by now; pause so the 60s/100 rate-limit window resets
# before the fare checks, otherwise these tail requests get 429.
Start-Sleep -Seconds 62
Write-Host ''
Write-Host '-- flight fares --' -ForegroundColor DarkGray
$zara = StaffLogin 'zara.travel@travelcrm.com'
Check 'TRAVEL_AGENT login (zara.travel)' ([bool]$zara)

if ($zara -and $custId) {
  $fx = Api GET '/flight-fares/search?fromCode=DXB&toCode=KHI' $null $zara
  $zFare = $fx.json.data[0]
  Check 'travel agent fare search 200' ($fx.status -eq 200 -and $fx.json.data.Count -gt 0) (Detail $fx)
  Check 'travel agent SEES baseFare (flights.create)' ($null -ne $zFare.PSObject.Properties['baseFare'])
  $sfx = Api GET '/flight-fares/search?fromCode=DXB&toCode=KHI' $null $sana
  $sfare = $sfx.json.data[0]
  Check 'sales agent HIDES baseFare (view only)' ($null -eq $sfare.PSObject.Properties['baseFare'])
  Check 'sales agent still sees sellingPrice' ($null -ne $sfare.PSObject.Properties['sellingPrice'])

  $khi = (Api GET '/airports?search=Karachi&active=true' $null $zara).json.data | Where-Object { $_.iataCode -eq 'KHI' } | Select-Object -First 1
  $doh = (Api GET '/airports?search=Doha&active=true' $null $zara).json.data | Where-Object { $_.iataCode -eq 'DOH' } | Select-Object -First 1
  $qatar = (Api GET '/airlines?search=Qatar&active=true' $null $zara).json.data | Where-Object { $_.code -eq 'QR' } | Select-Object -First 1
  Check 'master data resolves KHI/DOH/QR' ($khi -and $doh -and $qatar)

  $smokeFareId = $null
  if ($khi -and $doh -and $qatar) {
    $fc = Api POST '/flight-fares' @{
      airlineId = $qatar.id; flightNumber = 'QR90001'; originAirportId = $khi.id; destinationAirportId = $doh.id
      departureTime = (FutureIso 5); arrivalTime = (FutureIso 6); cabinClass = 'ECONOMY'
      baseFare = '150'; currencyCode = 'USD'; marginType = 'PERCENT'; marginValue = '20'; taxPercent = '0'; seatsTotal = 4; isActive = $true
    } $zara
    Check 'create fare (server computes selling)' ($fc.status -eq 201 -or $fc.status -eq 200) (Detail $fc)
    $smokeFareId = $fc.json.data.id
    Check 'selling = 180 for base 150 + 20%' ($fc.json.data.sellingPrice -eq 180) "got $($fc.json.data.sellingPrice)"

    $sold = Api POST "/flight-fares/$smokeFareId/sell" @{ customerId = $custId; pax = 2 } $zara
    Check 'sell 2 pax -> 201 CONFIRMED booking' ($sold.status -eq 201 -and $sold.json.data.status -eq 'CONFIRMED') (Detail $sold)
    Check 'booking total = 360 (2 x 180)' ($sold.json.data.totalAmount -eq 360) "got $($sold.json.data.totalAmount)"
    $smokeBookingId = $sold.json.data.id
    $fareAfter = (Api GET "/flight-fares/$smokeFareId" $null $zara).json.data
    Check 'seats decremented 4 -> 2' ($fareAfter.seatsLeft -eq 2) "got $($fareAfter.seatsLeft)"
    $over = Api POST "/flight-fares/$smokeFareId/sell" @{ customerId = $custId; pax = 5 } $zara
    Check 'oversell beyond seats rejected (4xx/409)' ($over.status -ge 400) (Detail $over)
    if ($smokeBookingId) { Api PATCH "/bookings/$smokeBookingId/status" @{ status = 'CANCELLED' } $zara | Out-Null }
    $fareRestored = (Api GET "/flight-fares/$smokeFareId" $null $zara).json.data
    Check 'cancel restores seats to 4' ($fareRestored.seatsLeft -eq 4) "got $($fareRestored.seatsLeft)"
  }

  $margins = Api GET '/reports/margins' $null $admin
  Check 'reports/margins returns summary envelope' ($margins.status -eq 200 -and $margins.json.data.summary.Count -gt 0) (Detail $margins)

  if ($smokeFareId) { Api DELETE "/flight-fares/$smokeFareId" $null $admin | Out-Null }
}

# ---------- 9. best-effort cleanup of smoke rows ----------
Write-Host ''
Write-Host '-- cleanup (best effort) --' -ForegroundColor DarkGray
# transition guards block deleting active rows - move them to a deletable state first
if ($bkId)   { Api PATCH "/bookings/$bkId/status" @{ status = 'CANCELLED' } $admin | Out-Null }
if ($appId)  { Api PATCH "/applications/$appId/status" @{ status = 'WITHDRAWN' } $admin | Out-Null }
$cleans = @(
  @{ m = 'DELETE'; p = "/quotations/$qtId" },
  @{ m = 'DELETE'; p = "/invoices/$invId" },
  @{ m = 'DELETE'; p = "/commissions/$comId" },
  @{ m = 'DELETE'; p = "/agents/$agId" },
  @{ m = 'DELETE'; p = "/expenses/$expId" },
  @{ m = 'DELETE'; p = "/suppliers/$supId" },
  @{ m = 'DELETE'; p = "/applications/$appId" },
  @{ m = 'DELETE'; p = "/bookings/$bkId" },
  @{ m = 'DELETE'; p = "/appointments/$aptId" },
  @{ m = 'DELETE'; p = "/customers/$custId" }
)
foreach ($c in $cleans) {
  if ($c.p -notmatch '/$|[a-f0-9]{8}-') { continue }
  Api $c.m $c.p $null $admin | Out-Null
}
Write-Host 'cleanup attempted (paid/linked rows may refuse deletion by design)' -ForegroundColor DarkGray

# ---------- summary ----------
Write-Host ''
Write-Host "RESULT: $script:pass passed, $script:fail failed" -ForegroundColor $(if ($script:fail -eq 0) { 'Green' } else { 'Red' })
if ($script:fail -gt 0) {
  Write-Host ('Failed: ' + ($script:failures -join '; ')) -ForegroundColor Red
  exit 1
}
exit 0
