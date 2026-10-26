#!/bin/bash
# Exercises the three inventory-availability scenarios against a local
# wrangler pages dev server. Run cafe/dev.sh first (or this script will
# tell you to), then: bash cafe/test-inventory.sh
#
# 1. Limit set, stock available -> item orderable, no "Not available yet"
# 2. Limit set, stock fully depleted -> item shows "Sold out (check with staff)"
# 3. Limit set, stock about to deplete -> drinks show no warning until the
#    very last unit, slices/pairings show the exact "N left" count as it drops

set -e
BASE="http://localhost:8788"

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    printf "  PASS  %s (got: %s)\n" "$label" "$actual"
  else
    printf "  FAIL  %s (expected: %s, got: %s)\n" "$label" "$expected" "$actual"
    exit 1
  fi
}

if ! curl -s -o /dev/null "$BASE/api/queue"; then
  echo "Local dev server isn't running. Start it first: bash cafe/dev.sh"
  exit 1
fi

echo "--- resetting test state ---"
curl -s -X POST "$BASE/api/reset-all" -H "x-staff-password: slaytea" > /dev/null
for key in teaone osmanthus banana grapefruit jasmine_sobacha sesame_miso; do
  curl -s -X POST "$BASE/api/inventory/reset" -H "content-type: application/json" -H "x-staff-password: slaytea" -d "{\"drink\":\"$key\"}" > /dev/null
done

echo
echo "=== Scenario 1: limit set, stock available -> orderable ==="
curl -s -X POST "$BASE/api/inventory" -H "content-type: application/json" -H "x-staff-password: slaytea" -d '{"drink":"teaone","total":10}' > /dev/null
REMAINING=$(curl -s "$BASE/api/inventory" | python3 -c "import json,sys; print(json.load(sys.stdin)['teaone']['remaining'])")
check "remaining is full total (10)" "10" "$REMAINING"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/orders" -H "content-type: application/json" -d '{"items":[{"drink":"teaone","qty":1}],"name":"Scenario1"}')
check "order succeeds (200)" "200" "$STATUS"

echo
echo "=== Scenario 2: stock fully depleted -> sold out, order rejected ==="
curl -s -X POST "$BASE/api/inventory" -H "content-type: application/json" -H "x-staff-password: slaytea" -d '{"drink":"osmanthus","total":2}' > /dev/null
curl -s -X POST "$BASE/api/orders" -H "content-type: application/json" -d '{"items":[{"drink":"osmanthus","qty":2}],"name":"Scenario2a"}' > /dev/null
REMAINING=$(curl -s "$BASE/api/inventory" | python3 -c "import json,sys; print(json.load(sys.stdin)['osmanthus']['remaining'])")
check "remaining is 0 after using the full limit" "0" "$REMAINING"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/orders" -H "content-type: application/json" -d '{"items":[{"drink":"osmanthus","qty":1}],"name":"Scenario2b"}')
check "ordering more is rejected (409)" "409" "$STATUS"

echo
echo "=== Scenario 3a: drink near depletion -> no warning until the last unit ==="
curl -s -X POST "$BASE/api/inventory" -H "content-type: application/json" -H "x-staff-password: slaytea" -d '{"drink":"banana","total":3}' > /dev/null
curl -s -X POST "$BASE/api/orders" -H "content-type: application/json" -d '{"items":[{"drink":"banana","qty":2}],"name":"Scenario3a"}' > /dev/null
REMAINING=$(curl -s "$BASE/api/inventory" | python3 -c "import json,sys; print(json.load(sys.stdin)['banana']['remaining'])")
check "1 left (no client badge expected at this point for drinks)" "1" "$REMAINING"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/orders" -H "content-type: application/json" -d '{"items":[{"drink":"banana","qty":1}],"name":"Scenario3a-last"}')
check "last unit still orderable (200)" "200" "$STATUS"
REMAINING=$(curl -s "$BASE/api/inventory" | python3 -c "import json,sys; print(json.load(sys.stdin)['banana']['remaining'])")
check "now exactly 0 -> client will show Sold out" "0" "$REMAINING"

echo
echo "=== Scenario 3b: pairing near depletion -> exact count shows as it drops ==="
curl -s -X POST "$BASE/api/inventory" -H "content-type: application/json" -H "x-staff-password: slaytea" -d '{"drink":"jasmine_sobacha","total":8}' > /dev/null
curl -s -X POST "$BASE/api/orders" -H "content-type: application/json" -d '{"items":[{"drink":"jasmine_sobacha","qty":3}],"name":"Scenario3b"}' > /dev/null
REMAINING=$(curl -s "$BASE/api/inventory" | python3 -c "import json,sys; print(json.load(sys.stdin)['jasmine_sobacha']['remaining'])")
check "5 left -> client will show the exact '5 left' badge (threshold is <=5)" "5" "$REMAINING"

echo
echo "All scenarios passed. Open these to see the corresponding UI:"
echo "  Order page:  $BASE/cafe/order"
echo "  Staff page:  $BASE/cafe/staff  (password: slaytea)"
echo
echo "On /cafe/order you should see:"
echo "  - Tea & 1: orderable, no badge (10 left of 10, scenario 1)"
echo "  - Osmanthus Coconut: greyed out, 'Sold out (check with staff)' (scenario 2)"
echo "  - Bananocano: still orderable, NO badge even at 1 left (scenario 3a, new behavior)"
echo "  - Jasmine Sobacha: orderable, showing '5 left' badge (scenario 3b)"
