#!/bin/bash
# Finance CNN+RAG — Start everything
# Usage: bash start.sh

set -e
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$PROJECT_DIR/../venv"

echo ""
echo "  ██████╗  ██╗     ██████╗ ██╗  ██╗  ██████╗ "
echo "  ██╔══██╗ ██║     ██╔══██╗██║  ██║  ██╔══██╗"
echo "  ███████║ ██║     ██████╔╝███████║  ███████║ "
echo "  ██╔══██║ ██║     ██╔═══╝ ██╔══██║  ██╔══██║"
echo "  ██║  ██║ ███████╗██║     ██║  ██║  ██║  ██║"
echo "  ╚═╝  ╚═╝ ╚══════╝╚═╝     ╚═╝  ╚═╝  ╚═╝  ╚═╝"
echo ""
echo "  CNN+RAG Finance Model"
echo "  ──────────────────────────────────────────"
echo ""

# Activate venv
if [ -f "$VENV/bin/activate" ]; then
  source "$VENV/bin/activate"
  echo "  ✓ Virtual environment activated"
else
  echo "  ✗ No venv found at $VENV"
  echo "    Run: python3.11 -m venv venv && source venv/bin/activate"
  echo "         pip install -r backend/requirements.txt"
  exit 1
fi

# Install deps if needed
echo "  ✓ Checking dependencies..."
pip install -q -r "$PROJECT_DIR/requirements.txt"

echo ""
echo "  ✓ Starting backend on http://localhost:8000"
echo "  ✓ Open frontend/index.html in your browser"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

cd "$PROJECT_DIR"
uvicorn main:app --reload --port 8000 --host 0.0.0.0
