#!/usr/bin/env bash
set -euo pipefail

# ─── Defaults (override via CLI flags or env vars) ───
API_PORT="${API_PORT:-3000}"
METRO_PORT="${METRO_PORT:-8081}"
PLATFORM="${PLATFORM:-ios}"
DEVICE="${DEVICE:-iPhoneAjay}"
SKIP_DB="${SKIP_DB:-false}"

# ─── Colors ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

get_local_ip() {
  ipconfig getifaddr en0 2>/dev/null || echo "localhost"
}

banner() {
  echo -e ""
  echo -e "${GREEN}${BOLD}  ╦ ╦┌─┐┬  ┬ ╦  ╦┌─┐┌┐┌┌┬┐┌─┐┌─┐┌─┐${NC}"
  echo -e "${GREEN}${BOLD}  ║║║├┤ │  │ ╚╗╔╝├─┤│││ │ ├─┤│ ┬├┤ ${NC}"
  echo -e "${GREEN}${BOLD}  ╚╩╝└─┘┴─┘┴─┘╚╝ ┴ ┴┘└┘ ┴ ┴ ┴└─┘└─┘${NC}"
  echo -e "${DIM}  PT Gym Management App${NC}"
  echo -e ""
}

usage() {
  banner
  cat <<EOF
${CYAN}Usage:${NC} ./scripts/dev.sh [command] [options]

${CYAN}Commands:${NC}
  ${BOLD}all${NC}         Start DB + backend + Metro ${DIM}(default)${NC}
  ${BOLD}device${NC}      Start all + build & deploy to physical device
  ${BOLD}backend${NC}     Start DB + backend only
  ${BOLD}mobile${NC}      Start Metro bundler only
  ${BOLD}db${NC}          Start PostgreSQL only
  ${BOLD}stop${NC}        Stop all running services
  ${BOLD}status${NC}      Show status of all services
  ${BOLD}logs${NC}        Tail backend logs

${CYAN}Options:${NC}
  -a, --api-port PORT      Backend API port ${DIM}(default: 3000)${NC}
  -m, --metro-port PORT    Metro bundler port ${DIM}(default: 8081)${NC}
  -p, --platform PLATFORM  ios | android ${DIM}(default: ios)${NC}
  -d, --device NAME        Device name ${DIM}(default: iPhoneAjay)${NC}
  --skip-db                Skip Docker DB startup
  -h, --help               Show this help

${CYAN}Examples:${NC}
  ./scripts/dev.sh                          ${DIM}# Start everything (Metro + backend + DB)${NC}
  ./scripts/dev.sh device                   ${DIM}# Build & run on iPhoneAjay${NC}
  ./scripts/dev.sh device -p android        ${DIM}# Build & run on Android device${NC}
  ./scripts/dev.sh -a 4000 -m 8082         ${DIM}# Custom ports${NC}
  ./scripts/dev.sh device -d "Other Phone"  ${DIM}# Different device${NC}
  ./scripts/dev.sh stop                     ${DIM}# Kill everything${NC}
EOF
  exit 0
}

# ─── Parse args ───
COMMAND="all"
while [[ $# -gt 0 ]]; do
  case "$1" in
    -a|--api-port)    API_PORT="$2"; shift 2 ;;
    -m|--metro-port)  METRO_PORT="$2"; shift 2 ;;
    -p|--platform)    PLATFORM="$2"; shift 2 ;;
    -d|--device)      DEVICE="$2"; shift 2 ;;
    --skip-db)        SKIP_DB="true"; shift ;;
    -h|--help)        usage ;;
    all|backend|mobile|device|db|stop|status|logs) COMMAND="$1"; shift ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; usage ;;
  esac
done

# ─── Dependency checks ───
check_deps() {
  local missing=()
  command -v node   >/dev/null 2>&1 || missing+=("node")
  command -v npm    >/dev/null 2>&1 || missing+=("npm")
  command -v docker >/dev/null 2>&1 || missing+=("docker")

  if [[ ${#missing[@]} -gt 0 ]]; then
    echo -e "${RED}Missing: ${missing[*]}${NC}"
    exit 1
  fi

  echo -e "${DIM}node $(node -v) | npm $(npm -v)${NC}"
}

ensure_deps_installed() {
  local dir="$1"
  if [[ ! -d "$dir/node_modules" ]]; then
    echo -e "${YELLOW}  Installing dependencies...${NC}"
    cd "$dir" && npm install --silent && cd "$ROOT_DIR"
  fi
}

# ─── Service functions ───
start_db() {
  if [[ "$SKIP_DB" == "true" ]]; then
    echo -e "${DIM}  Skipping DB (--skip-db)${NC}"
    return
  fi

  echo -e "${CYAN}[DB]${NC} Starting PostgreSQL..."
  cd "$ROOT_DIR"

  if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}  Docker is not running. Start Docker Desktop first.${NC}"
    exit 1
  fi

  docker compose up -d postgres 2>&1 | grep -v "already" || true

  # Wait for healthy
  local retries=0
  while [[ $retries -lt 15 ]]; do
    if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
      echo -e "${GREEN}[DB]${NC} PostgreSQL ready on port 5433"
      return
    fi
    retries=$((retries + 1))
    sleep 1
  done
  echo -e "${YELLOW}[DB]${NC} PostgreSQL started (may still be initializing)"
}

start_backend() {
  echo -e "${CYAN}[API]${NC} Starting backend on port ${API_PORT}..."
  cd "$ROOT_DIR/backend"
  ensure_deps_installed "$ROOT_DIR/backend"

  npx prisma generate --no-hints 2>/dev/null || true

  # Run DB migration if needed
  npx prisma db push --skip-generate 2>/dev/null || true

  APP_PORT="$API_PORT" npx nest start --watch 2>&1 &
  BACKEND_PID=$!

  # Wait for backend to respond
  local retries=0
  while [[ $retries -lt 20 ]]; do
    if curl -s "http://localhost:${API_PORT}/api" >/dev/null 2>&1; then
      echo -e "${GREEN}[API]${NC} Backend ready at http://localhost:${API_PORT}"
      return
    fi
    retries=$((retries + 1))
    sleep 1
  done
  echo -e "${GREEN}[API]${NC} Backend started (PID: $BACKEND_PID)"
}

start_mobile() {
  echo -e "${CYAN}[METRO]${NC} Starting Metro on port ${METRO_PORT}..."
  cd "$ROOT_DIR/mobile"
  ensure_deps_installed "$ROOT_DIR/mobile"

  npx react-native start --port "$METRO_PORT" 2>&1 &
  METRO_PID=$!

  sleep 2
  echo -e "${GREEN}[METRO]${NC} Metro running on port ${METRO_PORT}"
}

run_on_device() {
  local LOCAL_IP
  LOCAL_IP="$(get_local_ip)"
  cd "$ROOT_DIR/mobile"
  ensure_deps_installed "$ROOT_DIR/mobile"

  if [[ "$PLATFORM" == "ios" ]]; then
    # Install pods if needed
    if [[ -d "ios" && ! -d "ios/Pods" ]]; then
      echo -e "${CYAN}[IOS]${NC} Installing CocoaPods..."
      cd ios && /opt/homebrew/opt/ruby/bin/bundle exec pod install --silent && cd ..
    fi

    # Find device UDID
    UDID=$(xcrun xctrace list devices 2>/dev/null \
      | grep "$DEVICE" \
      | head -1 \
      | grep -oE '[0-9A-F]{8}-[0-9A-F]{16}' || true)

    if [[ -z "$UDID" ]]; then
      echo -e "${RED}[IOS] Device '${DEVICE}' not found.${NC}"
      echo -e "${YELLOW}Available physical devices:${NC}"
      xcrun xctrace list devices 2>/dev/null | grep -v "Simulator\|==\|^$" | head -10
      echo -e ""
      echo -e "${DIM}Tip: Connect your iPhone via USB and trust the computer.${NC}"
      exit 1
    fi

    echo -e "${CYAN}[IOS]${NC} Building for ${BOLD}${DEVICE}${NC} ${DIM}(${UDID})${NC}"
    echo -e "${DIM}  This may take a minute on first build...${NC}"

    xcodebuild \
      -workspace ios/WellVantage.xcworkspace \
      -scheme WellVantage \
      -destination "id=$UDID" \
      -allowProvisioningUpdates \
      RCT_METRO_PORT="$METRO_PORT" \
      2>&1 | tail -3 &
    DEVICE_PID=$!

  elif [[ "$PLATFORM" == "android" ]]; then
    if ! command -v adb >/dev/null 2>&1; then
      echo -e "${RED}[ANDROID] adb not found. Install Android SDK platform-tools.${NC}"
      exit 1
    fi

    echo -e "${CYAN}[ANDROID]${NC} Setting up port forwarding..."
    adb reverse tcp:"$METRO_PORT" tcp:"$METRO_PORT" 2>/dev/null || true
    adb reverse tcp:"$API_PORT" tcp:"$API_PORT" 2>/dev/null || true

    echo -e "${CYAN}[ANDROID]${NC} Building and deploying..."
    npx react-native run-android --port "$METRO_PORT" 2>&1 &
    DEVICE_PID=$!
  fi

  echo -e ""
  echo -e "${GREEN}[DEVICE]${NC} Build started for ${BOLD}${DEVICE}${NC} (${PLATFORM})"
  echo -e "${DIM}  API from device: http://${LOCAL_IP}:${API_PORT}${NC}"
}

show_status() {
  echo -e "${CYAN}Service Status:${NC}"

  # DB
  if docker compose ps postgres 2>/dev/null | grep -q "running"; then
    echo -e "  ${GREEN}●${NC} PostgreSQL (port 5433)"
  else
    echo -e "  ${RED}●${NC} PostgreSQL (stopped)"
  fi

  # Backend
  if pgrep -f "nest start" >/dev/null 2>&1; then
    echo -e "  ${GREEN}●${NC} Backend API (port ${API_PORT})"
  else
    echo -e "  ${RED}●${NC} Backend API (stopped)"
  fi

  # Metro
  if pgrep -f "react-native start" >/dev/null 2>&1; then
    echo -e "  ${GREEN}●${NC} Metro Bundler (port ${METRO_PORT})"
  else
    echo -e "  ${RED}●${NC} Metro Bundler (stopped)"
  fi
}

cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "${METRO_PID:-}" ]]   && kill "$METRO_PID" 2>/dev/null || true
  [[ -n "${DEVICE_PID:-}" ]]  && kill "$DEVICE_PID" 2>/dev/null || true
  echo -e "${GREEN}Done${NC}"
  exit 0
}

print_summary() {
  local LOCAL_IP
  LOCAL_IP="$(get_local_ip)"
  echo -e ""
  echo -e "${GREEN}${BOLD}All services running:${NC}"
  echo -e "  ${BOLD}API${NC}     http://localhost:${API_PORT}     ${DIM}(device: http://${LOCAL_IP}:${API_PORT})${NC}"
  echo -e "  ${BOLD}Metro${NC}   http://localhost:${METRO_PORT}"
  echo -e "  ${BOLD}DB${NC}      postgresql://localhost:5433"
  [[ -n "${DEVICE_PID:-}" ]] && echo -e "  ${BOLD}Device${NC}  ${DEVICE} (${PLATFORM})"
  echo -e ""
  echo -e "${DIM}Press Ctrl+C to stop all services${NC}"
}

# ─── Run ───
banner
check_deps

BACKEND_PID=""
METRO_PID=""
DEVICE_PID=""
trap cleanup SIGINT SIGTERM

case "$COMMAND" in
  all)
    start_db
    start_backend
    start_mobile
    print_summary
    wait
    ;;
  device)
    start_db
    start_backend
    start_mobile
    sleep 2
    run_on_device
    print_summary
    wait
    ;;
  backend)
    start_db
    start_backend
    echo -e "\n${GREEN}Backend running: http://localhost:${API_PORT}${NC}"
    echo -e "${DIM}Press Ctrl+C to stop${NC}"
    wait
    ;;
  mobile)
    start_mobile
    echo -e "\n${GREEN}Metro running: http://localhost:${METRO_PORT}${NC}"
    echo -e "${DIM}Press Ctrl+C to stop${NC}"
    wait
    ;;
  db)
    start_db
    ;;
  stop)
    echo -e "${CYAN}Stopping all services...${NC}"
    cd "$ROOT_DIR"
    docker compose down 2>/dev/null || true
    pkill -f "nest start" 2>/dev/null || true
    pkill -f "react-native start" 2>/dev/null || true
    echo -e "${GREEN}All services stopped${NC}"
    ;;
  status)
    show_status
    ;;
  logs)
    cd "$ROOT_DIR/backend"
    tail -f dist/main.js 2>/dev/null || echo -e "${YELLOW}No logs found. Is the backend running?${NC}"
    ;;
esac
