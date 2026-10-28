#!/bin/bash
echo "========================================================"
echo "  BizLens - Autonomous BI Engine & Intelligence"
echo "========================================================"
echo ""
echo "Starting BizLens via python app.py..."
python3 app.py 2>/dev/null || python app.py
