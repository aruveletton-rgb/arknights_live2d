#!/usr/bin/env bash
set -euo pipefail

VM1_BASE_URL="${VM1_BASE_URL:-http://127.0.0.1:18080}"
VM2_BASE_URL="${VM2_BASE_URL:-http://127.0.0.1}"
VM2_TTS_URL="${VM2_TTS_URL:-${VM2_BASE_URL%/}/tts}"
VM2_ASR_URL="${VM2_ASR_URL:-${VM2_BASE_URL%/}/asr}"
CURL_FLAGS=(--connect-timeout 3 --max-time 5 --silent --show-error)
if [[ "${INSECURE:-0}" == "1" ]]; then
  CURL_FLAGS+=(--insecure)
fi

check() {
  local name="$1"
  local url="$2"
  local response
  if response=$(curl "${CURL_FLAGS[@]}" "$url"); then
    printf '%s ok %s\n' "$name" "$response"
    return 0
  fi
  printf '%s down\n' "$name"
  return 1
}

failed=0
check vm1-orchestrator "${VM1_BASE_URL%/}/api/health" || failed=1
check vm2-tts "${VM2_TTS_URL%/}/api/health" || failed=1
check vm2-asr "${VM2_ASR_URL%/}/api/health" || failed=1

if (( failed )); then
  exit 2
fi
