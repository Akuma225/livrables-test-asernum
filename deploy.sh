#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Erreur: 'docker' introuvable. Installe Docker Desktop et réessaie." >&2
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "Erreur: 'docker compose' indisponible. Mets Docker à jour (Compose v2)." >&2
    exit 1
  fi
}

discover_compose_files() {
  # Retourne des chemins ABSOLUS (un par ligne)
  # maxdepth 3 pour couvrir: ./<projet>/docker-compose.yml
  find "$ROOT_DIR" -maxdepth 3 -type f \( -name "docker-compose.yml" -o -name "docker-compose.yaml" -o -name "docker-compose*.yml" -o -name "docker-compose*.yaml" \) \
    | sort
}

project_label_for_compose() {
  local compose_file="$1"
  # ex: /path/postgres/docker-compose.yml -> postgres
  basename "$(dirname "$compose_file")"
}

get_compose_files_index() {
  # Construit un index: label -> chemin compose
  # Sorties sur stdout sous forme "label|/abs/path/docker-compose.yml"
  local f label
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    label="$(project_label_for_compose "$f")"
    printf "%s|%s\n" "$label" "$f"
  done < <(discover_compose_files)
}

compose_up() {
  local compose_file="$1"
  local service="${2:-}"
  local do_build="${3:-false}"
  local dir file
  dir="$(dirname "$compose_file")"
  file="$(basename "$compose_file")"

  (
    cd "$dir"
    if [[ -n "${service}" ]]; then
      if [[ "$do_build" == "true" ]]; then
        # Workaround Windows/BuildKit snapshot corruption:
        # désactiver BuildKit uniquement quand on build.
        DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose -f "$file" up -d --build --force-recreate "$service"
      else
        docker compose -f "$file" up -d "$service"
      fi
    else
      if [[ "$do_build" == "true" ]]; then
        # Workaround Windows/BuildKit snapshot corruption:
        # désactiver BuildKit uniquement quand on build.
        DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose -f "$file" up -d --build --force-recreate
      else
        docker compose -f "$file" up -d
      fi
    fi
  )
}

is_external_label() {
  local lbl="$1"
  case "$lbl" in
    clamav|kafka|postgres|redis|rustfs) return 0 ;;
    *) return 1 ;;
  esac
}

compose_down() {
  local compose_file="$1"
  local dir file
  dir="$(dirname "$compose_file")"
  file="$(basename "$compose_file")"

  (
    cd "$dir"
    docker compose -f "$file" down
  )
}

compose_ps() {
  local compose_file="$1"
  local dir file
  dir="$(dirname "$compose_file")"
  file="$(basename "$compose_file")"

  (
    cd "$dir"
    docker compose -f "$file" ps
  )
}

pick_from_list() {
  # Affiche une liste numérotée depuis stdin, retourne l'item choisi sur stdout.
  local prompt="${1:-Choisis une option}"
  shift || true
  local -a items=()
  local line
  while IFS= read -r line; do
    [[ -n "$line" ]] && items+=("$line")
  done

  if [[ "${#items[@]}" -eq 0 ]]; then
    return 1
  fi

  # Important: si la liste est fournie via un pipe, stdin n'est plus le terminal.
  # On affiche et on lit depuis /dev/tty pour rester interactif.
  local TTY="/dev/tty"
  if [[ ! -r "$TTY" || ! -w "$TTY" ]]; then
    TTY="/dev/stderr"
  fi

  echo "" >"$TTY"
  echo "$prompt" >"$TTY"
  local i
  for i in "${!items[@]}"; do
    printf "  %2d) %s\n" "$((i + 1))" "${items[$i]}" >"$TTY"
  done
  echo "   0) Retour" >"$TTY"
  echo -n "> " >"$TTY"

  local choice
  if [[ "$TTY" == "/dev/tty" ]]; then
    read -r choice </dev/tty
  else
    # Fallback (si /dev/tty indisponible)
    read -r choice
  fi
  if [[ "$choice" == "0" ]]; then
    return 1
  fi
  if ! [[ "$choice" =~ ^[0-9]+$ ]]; then
    return 1
  fi
  if (( choice < 1 || choice > ${#items[@]} )); then
    return 1
  fi

  echo "${items[$((choice - 1))]}"
}

list_services_for_compose() {
  local compose_file="$1"
  local dir file
  dir="$(dirname "$compose_file")"
  file="$(basename "$compose_file")"
  (
    cd "$dir"
    docker compose -f "$file" config --services 2>/dev/null || true
  )
}

up_all() {
  # Externes à démarrer en premier (ordre imposé)
  local -a external_order=(clamav kafka postgres redis rustfs)

  # Index des compose présents
  declare -A compose_by_label=()
  local -a all_labels=()
  local line label path
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    label="${line%%|*}"
    path="${line#*|}"
    compose_by_label["$label"]="$path"
    all_labels+=("$label")
  done < <(get_compose_files_index)

  if [[ "${#all_labels[@]}" -eq 0 ]]; then
    echo "Aucun docker-compose trouvé sous: $ROOT_DIR"
    return 1
  fi

  echo ""
  echo "1/3) Arrêt préalable (down) de toute l'architecture..."
  down_all

  echo ""
  echo "2/3) Démarrage des services externes (dans l'ordre)..."
  local started=0
  local ext
  for ext in "${external_order[@]}"; do
    if [[ -n "${compose_by_label[$ext]:-}" ]]; then
      echo ""
      echo "-> $ext  (${compose_by_label[$ext]})"
      compose_up "${compose_by_label[$ext]}"
      started=$((started + 1))
    else
      echo ""
      echo "-> $ext  (absent, ignoré)"
    fi
  done

  echo ""
  echo "3/3) Démarrage des services internes (restants)..."
  local lbl
  for lbl in "${all_labels[@]}"; do
    if is_external_label "$lbl"; then
      continue
    fi
    echo ""
    echo "-> $lbl  (${compose_by_label[$lbl]})"
    compose_up "${compose_by_label[$lbl]}" "" "true"
    started=$((started + 1))
  done

  echo ""
  echo "OK: architecture démarrée ($started compose)."
}

down_all() {
  local -a files=()
  while IFS= read -r f; do
    [[ -n "$f" ]] && files+=("$f")
  done < <(discover_compose_files)

  if [[ "${#files[@]}" -eq 0 ]]; then
    echo "Aucun docker-compose trouvé sous: $ROOT_DIR"
    return 1
  fi

  echo ""
  echo "Arrêt de toute l'architecture (${#files[@]} compose)..."
  local f
  for f in "${files[@]}"; do
    echo ""
    echo "-> $(project_label_for_compose "$f")  ($f)"
    compose_down "$f" || true
  done
  echo ""
  echo "OK: architecture arrêtée."
}

up_project() {
  local -a files=()
  while IFS= read -r f; do
    [[ -n "$f" ]] && files+=("$f")
  done < <(discover_compose_files)

  if [[ "${#files[@]}" -eq 0 ]]; then
    echo "Aucun docker-compose trouvé."
    return 1
  fi

  local selection
  selection="$(
    for f in "${files[@]}"; do
      printf "%s | %s\n" "$(project_label_for_compose "$f")" "$f"
    done | pick_from_list "Quel projet veux-tu démarrer ?"
  )" || return 0

  local compose_file project
  project="${selection%% | *}"
  compose_file="${selection#* | }"
  echo ""
  echo "Démarrage: $project"
  if is_external_label "$project"; then
    compose_up "$compose_file"
  else
    compose_up "$compose_file" "" "true"
  fi
  echo "OK."
}

up_service() {
  local -a files=()
  while IFS= read -r f; do
    [[ -n "$f" ]] && files+=("$f")
  done < <(discover_compose_files)

  if [[ "${#files[@]}" -eq 0 ]]; then
    echo "Aucun docker-compose trouvé."
    return 1
  fi

  local selection
  selection="$(
    for f in "${files[@]}"; do
      printf "%s | %s\n" "$(project_label_for_compose "$f")" "$f"
    done | pick_from_list "Dans quel projet est le service ?"
  )" || return 0

  local compose_file project
  project="${selection%% | *}"
  compose_file="${selection#* | }"

  local service
  service="$(list_services_for_compose "$compose_file" | pick_from_list "Quel service démarrer dans '$project' ?")" || return 0

  echo ""
  echo "Démarrage: $project / $service"
  if is_external_label "$project"; then
    compose_up "$compose_file" "$service"
  else
    compose_up "$compose_file" "$service" "true"
  fi
  echo "OK."
}

status_all() {
  local -a files=()
  while IFS= read -r f; do
    [[ -n "$f" ]] && files+=("$f")
  done < <(discover_compose_files)

  if [[ "${#files[@]}" -eq 0 ]]; then
    echo "Aucun docker-compose trouvé."
    return 1
  fi

  local f
  for f in "${files[@]}"; do
    echo ""
    echo "== $(project_label_for_compose "$f") =="
    compose_ps "$f" || true
  done
}

main_menu() {
  while true; do
    echo ""
    echo "============================"
    echo " Déploiement - Menu"
    echo " Racine: $ROOT_DIR"
    echo "============================"
    echo "  1) Démarrer toute l'architecture (down puis up, ordre imposé)"
    echo "  2) Démarrer un projet (docker-compose)"
    echo "  3) Démarrer un service (dans un projet)"
    echo "  4) Arrêter toute l'architecture (down)"
    echo "  5) Statut (ps) de tous les projets"
    echo "  0) Quitter"
    echo -n "> "

    local choice
    read -r choice
    case "$choice" in
      1) up_all ;;
      2) up_project ;;
      3) up_service ;;
      4) down_all ;;
      5) status_all ;;
      0) exit 0 ;;
      *) echo "Option invalide." ;;
    esac
  done
}

require_docker
main_menu

