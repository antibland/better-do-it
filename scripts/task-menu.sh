#!/bin/bash

set -e

if [ -z "$BASE" ] || [ -z "$COOKIE" ]; then
  if [ -z "$BASE" ]; then
    echo "BASE not found"
    echo "export BASE=http://localhost:3000"
  fi
  if [ -z "$COOKIE" ]; then
    echo "COOKIE not found"
    echo "export COOKIE='better-do-it.session_token=REPLACE_WITH_YOUR_VALUE'"
  fi
  exit 1
fi

echo ""
echo "BASE: $BASE"
echo "COOKIE: ${COOKIE:0:20}..."
echo ""

while true; do
  echo "========================================="
  echo "Task API Menu"
  echo "========================================="
  echo "1) Get all user tasks"
  echo "2) Get completed tasks"
  echo "3) Get master tasks"
  echo "4) Get active tasks"
  echo "5) Get all tasks (full response)"
  echo "6) Create a task"
  echo "7) Update a task"
  echo "8) Delete a task"
  echo "9) Exit"
  echo ""
  read -p "Choose an option (1-9): " choice

  case $choice in
    1)
      echo ""
      response=$(curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE")
      if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        echo "Error: $(echo "$response" | jq -r '.error')"
      else
        echo "$response" | jq '.tasks[]? | {id, title}'
      fi
      echo ""
      ;;
    2)
      echo ""
      response=$(curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE")
      if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        echo "Error: $(echo "$response" | jq -r '.error')"
      else
        echo "$response" | jq '.tasks[]? | select(.isCompleted == 1) | {id, title}'
      fi
      echo ""
      ;;
    3)
      echo ""
      response=$(curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE")
      if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        echo "Error: $(echo "$response" | jq -r '.error')"
      else
        echo "$response" | jq '.masterTasks[]? | {id, title}'
      fi
      echo ""
      ;;
    4)
      echo ""
      response=$(curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE")
      if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        echo "Error: $(echo "$response" | jq -r '.error')"
      else
        echo "$response" | jq '.activeTasks[]? | {id, title}'
      fi
      echo ""
      ;;
    5)
      echo ""
      curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq
      echo ""
      ;;
    6)
      echo ""
      read -p "Enter task title: " title
      if [ -n "$title" ]; then
        curl -s -X POST "$BASE/api/tasks" \
          -H "Content-Type: application/json" \
          -H "Cookie: $COOKIE" \
          -d "{\"title\":\"$title\"}" | jq
      else
        echo "Task title cannot be empty"
      fi
      echo ""
      ;;
    7)
      echo ""
      echo "Fetching your tasks..."
      tasks=$(curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq -r '.tasks[] | "\(.id)|\(.title)"')
      
      if [ -z "$tasks" ]; then
        echo "No tasks found"
        echo ""
        continue
      fi

      echo ""
      echo "Your tasks:"
      task_ids=()
      i=1
      while IFS='|' read -r id title; do
        echo "$i) $title"
        task_ids+=("$id")
        ((i++))
      done <<< "$tasks"
      
      echo ""
      read -p "Select task number to update: " task_num
      
      if [ "$task_num" -ge 1 ] && [ "$task_num" -le "${#task_ids[@]}" ]; then
        task_id="${task_ids[$((task_num-1))]}"
        read -p "Enter new title: " new_title
        
        if [ -n "$new_title" ]; then
          curl -s -X PATCH "$BASE/api/tasks/$task_id" \
            -H "Content-Type: application/json" \
            -H "Cookie: $COOKIE" \
            -d "{\"title\":\"$new_title\"}" | jq
        else
          echo "Title cannot be empty"
        fi
      else
        echo "Invalid selection"
      fi
      echo ""
      ;;
    8)
      echo ""
      echo "Fetching your tasks..."
      tasks=$(curl -s "$BASE/api/tasks" -H "Cookie: $COOKIE" | jq -r '.tasks[] | "\(.id)|\(.title)"')
      
      if [ -z "$tasks" ]; then
        echo "No tasks found"
        echo ""
        continue
      fi

      echo ""
      echo "Your tasks:"
      task_ids=()
      i=1
      while IFS='|' read -r id title; do
        echo "$i) $title"
        task_ids+=("$id")
        ((i++))
      done <<< "$tasks"
      
      echo ""
      read -p "Select task number to delete: " task_num
      
      if [ "$task_num" -ge 1 ] && [ "$task_num" -le "${#task_ids[@]}" ]; then
        task_id="${task_ids[$((task_num-1))]}"
        read -p "Are you sure? (y/n): " confirm
        
        if [ "$confirm" = "y" ]; then
          curl -s -X DELETE "$BASE/api/tasks/$task_id" -H "Cookie: $COOKIE" | jq
          echo "Task deleted"
        else
          echo "Cancelled"
        fi
      else
        echo "Invalid selection"
      fi
      echo ""
      ;;
    9)
      echo "Goodbye!"
      exit 0
      ;;
    *)
      echo "Invalid option"
      echo ""
      ;;
  esac
done

