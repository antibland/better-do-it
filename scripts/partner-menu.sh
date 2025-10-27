#!/bin/bash

set -e

if [ -z "$BASE" ] || [ -z "$COOKIE" ]; then
  if [ -z "$BASE" ]; then
    echo "BASE not found"
  fi
  if [ -z "$COOKIE" ]; then
    echo "COOKIE not found"
  fi
  exit 1
fi

# Helper function to get users not yet partnered with current user
get_available_partners() {
  echo ""
  echo "Fetching available users to partner with..."
  
  # Get current user's ID
  current_user_id=$(curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq -r '.tasks[0].userId // empty' 2>/dev/null)
  
  if [ -z "$current_user_id" ]; then
    echo "Could not determine current user. Please enter email manually."
    read -p "Enter partner's email address: " email
    if [ -n "$email" ]; then
      echo "Creating partnership..."
      curl -s -X POST "$BASE/api/partner" \
        -H "Content-Type: application/json" \
        -H "Cookie: $COOKIE" \
        -d "{\"email\":\"$email\"}" | jq
    fi
    return 0
  fi
  
  # Check if we can access the database (dev server must be stopped)
  if [ -f "sqlite.db" ]; then
    echo "Checking database for available users..."
    
    # Get current user's email
    current_user_email=$(sqlite3 sqlite.db "SELECT email FROM user WHERE id = '$current_user_id';" 2>/dev/null || echo "")
    
    if [ -n "$current_user_email" ]; then
      echo "Current user: $current_user_email"
      
      # Get all users except current user and existing partners
      available_users=$(sqlite3 sqlite.db "
        SELECT u.name, u.email 
        FROM user u 
        WHERE u.id != '$current_user_id' 
        AND u.id NOT IN (
          SELECT CASE 
            WHEN userA = '$current_user_id' THEN userB 
            ELSE userA 
          END 
          FROM partnership 
          WHERE userA = '$current_user_id' OR userB = '$current_user_id'
        )
        ORDER BY u.name;" 2>/dev/null || echo "")
      
      if [ -n "$available_users" ]; then
        echo ""
        echo "Available users to partner with:"
        user_emails=()
        i=1
        while IFS='|' read -r name email; do
          echo "$i) $name ($email)"
          user_emails+=("$email")
          ((i++))
        done <<< "$available_users"
        
        echo ""
        read -p "Select user number to partner with: " choice
        
        if [ "$choice" -ge 1 ] && [ "$choice" -le "${#user_emails[@]}" ]; then
          partner_email="${user_emails[$((choice-1))]}"
          echo "Creating partnership with $partner_email..."
          
          result=$(curl -s -X POST "$BASE/api/partner" \
            -H "Content-Type: application/json" \
            -H "Cookie: $COOKIE" \
            -d "{\"email\":\"$partner_email\"}")
          
          echo "$result" | jq
          
          # Check if successful and extract partner info
          partner_name_result=$(echo "$result" | jq -r '.partner.name // empty')
          partner_email_result=$(echo "$result" | jq -r '.partner.email // empty')
          if [ -n "$partner_name_result" ] && [ -n "$partner_email_result" ]; then
            echo ""
            echo "✅ You are now partnered with $partner_name_result ($partner_email_result)"
          fi
        else
          echo "Invalid selection"
        fi
      else
        echo "No available users found to partner with."
        echo "All users are already partnered with you or don't exist."
      fi
    else
      echo "Could not find current user in database."
      echo "Please enter email manually:"
      read -p "Enter partner's email address: " email
      if [ -n "$email" ]; then
        echo "Creating partnership..."
        curl -s -X POST "$BASE/api/partner" \
          -H "Content-Type: application/json" \
          -H "Cookie: $COOKIE" \
          -d "{\"email\":\"$email\"}" | jq
      fi
    fi
  else
    echo "Database not accessible (dev server running?)."
    echo "Please enter email manually:"
    read -p "Enter partner's email address: " email
    if [ -n "$email" ]; then
      echo "Creating partnership..."
      curl -s -X POST "$BASE/api/partner" \
        -H "Content-Type: application/json" \
        -H "Cookie: $COOKIE" \
        -d "{\"email\":\"$email\"}" | jq
    fi
  fi
}

echo ""
echo "BASE: $BASE"
echo "COOKIE: ${COOKIE:0:20}..."
echo ""

while true; do
  echo "========================================="
  echo "Partner API Menu"
  echo "========================================="
  echo "1) Get current partners"
  echo "2) Add a partner"
  echo "3) Unpair from a partner"
  echo "4) Unpair from all partners"
  echo "5) Get partner's active tasks"
  echo "6) Exit"
  echo ""
  read -p "Choose an option (1-6): " choice

  case $choice in
    1)
      echo ""
      echo "Fetching current partners..."
      curl -s "$BASE/api/partner" -H "Cookie: $COOKIE" | jq
      echo ""
      ;;
    2)
      get_available_partners
      echo ""
      ;;
    3)
      echo ""
      echo "Fetching current partners..."
      partners=$(curl -s "$BASE/api/partner" -H "Cookie: $COOKIE" | jq -r '.partners[]? | "\(.partnershipId)|\(.name)|\(.email)"')
      
      if [ -z "$partners" ]; then
        echo "No partners found"
        echo ""
        continue
      fi

      echo ""
      echo "Your partners:"
      partnership_ids=()
      i=1
      while IFS='|' read -r partnership_id name email; do
        echo "$i) $name ($email)"
        partnership_ids+=("$partnership_id")
        ((i++))
      done <<< "$partners"
      
      echo ""
      read -p "Select partner number to unpair from: " partner_num
      
      if [ "$partner_num" -ge 1 ] && [ "$partner_num" -le "${#partnership_ids[@]}" ]; then
        partnership_id="${partnership_ids[$((partner_num-1))]}"
        read -p "Are you sure? (y/n): " confirm
        
        if [ "$confirm" = "y" ]; then
          curl -s -X DELETE "$BASE/api/partner" \
            -H "Content-Type: application/json" \
            -H "Cookie: $COOKIE" \
            -d "{\"partnershipId\":\"$partnership_id\"}" | jq
          echo "Partnership ended"
        else
          echo "Cancelled"
        fi
      else
        echo "Invalid selection"
      fi
      echo ""
      ;;
    4)
      echo ""
      read -p "Are you sure you want to unpair from ALL partners? (y/n): " confirm
      
      if [ "$confirm" = "y" ]; then
        echo "Fetching current partners..."
        partnerships=$(curl -s "$BASE/api/partner" -H "Cookie: $COOKIE" | jq -r '.partners[]?.partnershipId')
        
        if [ -z "$partnerships" ]; then
          echo "No partners found"
        else
          echo "Unpairing from all partners..."
          for partnership_id in $partnerships; do
            curl -s -X DELETE "$BASE/api/partner" \
              -H "Content-Type: application/json" \
              -H "Cookie: $COOKIE" \
              -d "{\"partnershipId\":\"$partnership_id\"}" | jq
          done
          echo "All partnerships ended"
        fi
      else
        echo "Cancelled"
      fi
      echo ""
      ;;
    5)
      echo ""
      echo "Fetching current partners..."
      partners=$(curl -s "$BASE/api/partner" -H "Cookie: $COOKIE" | jq -r '.partners[]? | "\(.id)|\(.name)|\(.email)"')
      
      if [ -z "$partners" ]; then
        echo "No partners found"
        echo ""
        continue
      fi

      echo ""
      echo "Your partners:"
      partner_ids=()
      i=1
      while IFS='|' read -r partner_id name email; do
        echo "$i) $name ($email)"
        partner_ids+=("$partner_id")
        ((i++))
      done <<< "$partners"
      
      echo ""
      read -p "Select partner number to view tasks: " partner_num
      
      if [ "$partner_num" -ge 1 ] && [ "$partner_num" -le "${#partner_ids[@]}" ]; then
        partner_id="${partner_ids[$((partner_num-1))]}"
        echo ""
        echo "Fetching partner's active tasks..."
        curl -s "$BASE/api/partner/tasks?partnerId=$partner_id" -H "Cookie: $COOKIE" | jq
      else
        echo "Invalid selection"
      fi
      echo ""
      ;;
    6)
      echo "Goodbye!"
      exit 0
      ;;
    *)
      echo "Invalid option. Please choose 1-6."
      echo ""
      ;;
  esac
done
