#!/bin/bash
echo "restarting"
cd goran-slack-command
git pull
forever restartall
echo "restarting"