#!/usr/bin/env bash
#
# setup-ecc-skills.sh — installa in modo selettivo un sottoinsieme delle skill di
# affaan-m/ECC e verifica che siano strutturalmente valide.
#
# Due profili:
#   implementation (default)  skill per scrivere codice in un progetto React+Vite
#                             con API serverless e test node --test;
#   analysis                  skill per analizzare una piattaforma senza toccarla,
#                             nell'ordine delle fasi di un report di analisi.
#
# Principi:
#   * idempotente: rieseguirlo non cambia nulla se la sorgente non è cambiata;
#   * selettivo: tocca solo le skill elencate nel profilo attivo;
#   * non invasivo: scrive solo dentro $SKILLS_DIR (più i symlink nelle directory
#     degli altri host), non modifica package.json, src/, configurazioni o altre
#     skill già presenti, e in quelle directory tocca solo symlink;
#   * leggero: usa un partial clone (blob filter) + sparse checkout, così
#     scarica solo le directory delle skill scelte invece dell'intero repo.
#
# Uso:
#   ./scripts/setup-ecc-skills.sh                     # installa/aggiorna
#   ./scripts/setup-ecc-skills.sh --check             # verifica (nessuna rete)
#   ./scripts/setup-ecc-skills.sh --list              # skill del profilo attivo
#   ./scripts/setup-ecc-skills.sh --plan              # ordine di invocazione
#   ./scripts/setup-ecc-skills.sh --help
#
# Variabili d'ambiente:
#   ECC_PROFILE     implementation (default) oppure analysis
#   ECC_REF         branch, tag o sha da installare (default: main)
#   ECC_SKILLS_DIR  destinazione esplicita; se impostata vince sul rilevamento
#   ECC_SRC         checkout locale di ECC da riusare (salta la rete)
#
# Destinazione: senza ECC_SKILLS_DIR lo script rileva la convenzione dell'host
# con questo ordine: (1) una directory di skill già popolata — .agents/skills,
# .claude/skills, .github/skills, .cursor/skills, .cline/skills,
# .opencode/skills — perché installare dove le skill già vivono evita due
# directory di cui l'host ne legge una sola; (2) i marker presenti nel
# repository (CLAUDE.md, .claude/, .github/copilot-instructions.md, .cursor/,
# .cline/, .opencode/); (3) in assenza di marker, .agents/skills, la convenzione
# condivisa da Codex, Cursor, Copilot, Gemini CLI e opencode.
# Se nel repository convivono host diversi (per esempio CLAUDE.md e .cursor/),
# le skill sono scritte una volta sola nella directory primaria e collegate con
# symlink relativi nelle directory degli altri host rilevati: il contenuto resta
# uno solo su disco. I collegamenti che puntano a skill non più presenti nella
# primaria vengono rimossi (mai percorsi reali). Con ECC_SKILLS_DIR non c'è
# rilevamento né collegamento.
# La scelta e il motivo sono stampati a ogni esecuzione.
#
# Esempi:
#   ECC_PROFILE=analysis ./scripts/setup-ecc-skills.sh
#   ECC_PROFILE=analysis ./scripts/setup-ecc-skills.sh --check
#
set -euo pipefail

ECC_REPO="${ECC_REPO:-affaan-m/ECC}"
ECC_REF="${ECC_REF:-main}"
ECC_PROFILE="${ECC_PROFILE:-implementation}"
SKILLS_DIR="${ECC_SKILLS_DIR:-.agents/skills}"
ECC_SRC="${ECC_SRC:-}"
LOCK_FILE=".ecc-skills.lock"

# Profilo "implementation": skill per modificare il codice di TraduLimba —
# React 19 + Vite (frontend), API serverless su Vercel, test con `node --test`,
# CSP e superficie di sicurezza rilevanti.
IMPLEMENTATION_SKILLS=(
  "ecc-conventions"      # convenzioni base di ECC, richieste dalle altre skill
  "coding-standards"     # standard di codice coerenti col progetto
  "frontend-patterns"    # React/UI: src/components, src/features
  "backend-patterns"     # handler e logica lato server
  "api-design"           # contratti di /api/translate e /api/speech
  "security-review"      # validazione input, segreti, CSP, rate limit
  "tdd-workflow"         # test-first con il runner già in uso
  "verification-loop"    # ciclo test/lint/typecheck/build
  "documentation-lookup" # consultazione docs prima di improvvisare
)

# Profilo "analysis": una skill per ogni fase dell'analisi, pensata per essere
# usata su un progetto di cui non si conosce lo stack (non assume framework).
ANALYSIS_SKILLS=(
  "ecc-conventions"               # base: convenzioni usate dalle altre skill
  "product-capability"            # fase 1: capacità reali vs promesse
  "frontend-patterns"             # fase 2: stato, data flow, componenti
  "backend-patterns"              # fase 2: API, query, errori, timeout
  "security-review"               # fase 3: autorizzazione, input, segreti
  "verification-loop"             # fase 4: baseline test/lint/build
  "competitive-platform-analysis" # fase 5: posizionamento
  "competitive-report-structure"  # fase 5: struttura del report
  "market-research"               # fase 5: fonti e mercato
  "change-impact"                 # fase 6: blast radius degli interventi
  "plan-canvas"                   # fase 6: piano di esecuzione
  "documentation-lookup"          # trasversale: docs prima di improvvisare
)

case "$ECC_PROFILE" in
  implementation) SELECTED_SKILLS=("${IMPLEMENTATION_SKILLS[@]}") ;;
  analysis)       SELECTED_SKILLS=("${ANALYSIS_SKILLS[@]}") ;;
  *) printf 'profilo sconosciuto: %s (usa implementation o analysis)\n' "$ECC_PROFILE" >&2; exit 2 ;;
esac

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

# Convenzioni di skill documentate, dalla più condivisa alla più specifica.
SKILL_DIR_CANDIDATES=(
  ".agents/skills"   # Codex, Cursor, Copilot, Gemini CLI, opencode
  ".claude/skills"   # Claude Code, opencode, Copilot
  ".github/skills"   # GitHub Copilot
  ".cursor/skills"   # Cursor
  ".cline/skills"    # Cline
  ".opencode/skills" # opencode
)

# Vero se la directory contiene almeno una skill reale (non un symlink: uno
# scheletro di collegamenti non è la destinazione, è una propagazione).
dir_has_skills() {
  local d
  for d in "$1"/*/; do
    if [ ! -L "${d%/}" ] && [ -f "${d}SKILL.md" ]; then return 0; fi
  done
  return 1
}

# Directory che un host legge, dalla più condivisa alla più specifica.
host_dirs_for() {
  case "$1" in
    claude)   printf '%s\n' ".claude/skills" ;;
    copilot)  printf '%s\n' ".agents/skills" ".github/skills" ".claude/skills" ;;
    cursor)   printf '%s\n' ".agents/skills" ".cursor/skills" ;;
    cline)    printf '%s\n' ".agents/skills" ".cline/skills" ;;
    opencode) printf '%s\n' ".agents/skills" ".opencode/skills" ".claude/skills" ;;
    *)        printf '%s\n' ".agents/skills" ;;
  esac
}

# Vero se la stringa $2 compare nell'elenco degli argomenti successivi.
contains() {
  local needle="$1" x
  shift
  for x in "$@"; do
    if [ "$x" = "$needle" ]; then return 0; fi
  done
  return 1
}

# Imposta SKILLS_DIR, SKILLS_DIR_REASON e EXTRA_DIRS (directory secondarie da
# collegare con symlink alla primaria).
detect_skills_dir() {
  local candidate populated=() has_claude=0 hosts="" host

  # Directory di skill già popolate: è il segnale più affidabile, perché è la
  # convenzione che l'host sta effettivamente leggendo oggi.
  for candidate in "${SKILL_DIR_CANDIDATES[@]}"; do
    if [ -d "$REPO_ROOT/$candidate" ] && dir_has_skills "$REPO_ROOT/$candidate"; then
      populated+=("$candidate")
    fi
  done

  # Host attivi, dedotti dai marker presenti nel repository.
  DETECTED_HOSTS=()
  if [ -f "$REPO_ROOT/CLAUDE.md" ] || [ -d "$REPO_ROOT/.claude" ]; then
    has_claude=1
    hosts="claude"
    DETECTED_HOSTS+=("claude")
  fi
  if [ -f "$REPO_ROOT/.github/copilot-instructions.md" ] \
     || [ -d "$REPO_ROOT/.github/instructions" ] \
     || [ -d "$REPO_ROOT/.github/skills" ]; then
    hosts="$hosts copilot"
    DETECTED_HOSTS+=("copilot")
  fi
  if [ -d "$REPO_ROOT/.cursor" ]; then
    hosts="$hosts cursor"
    DETECTED_HOSTS+=("cursor")
  fi
  if [ -d "$REPO_ROOT/.cline" ]; then
    hosts="$hosts cline"
    DETECTED_HOSTS+=("cline")
  fi
  if [ -d "$REPO_ROOT/.opencode" ]; then
    hosts="$hosts opencode"
    DETECTED_HOSTS+=("opencode")
  fi
  hosts="${hosts# }"

  # 1. Riuso di una directory già popolata.
  if [ "${#populated[@]}" -gt 0 ]; then
    candidate="${populated[0]}"
    # Con Claude Code presente, la sua directory batte .agents/skills, che non legge.
    if [ "$has_claude" -eq 1 ]; then
      for host in "${populated[@]}"; do
        if [ "$host" = ".claude/skills" ]; then candidate="$host"; fi
      done
    fi
    SKILLS_DIR="$candidate"
    SKILLS_DIR_REASON="riuso: $candidate contiene già delle skill"
  # 2. Claude Code è l'unico host che non legge .agents/skills.
  elif [ "$has_claude" -eq 1 ]; then
    SKILLS_DIR=".claude/skills"
    SKILLS_DIR_REASON="marker Claude Code (CLAUDE.md o .claude/): non legge .agents/skills"
  # 3. Convenzione condivisa: è quella letta dal maggior numero di host.
  elif [ -n "$hosts" ]; then
    SKILLS_DIR=".agents/skills"
    SKILLS_DIR_REASON="marker host ($hosts): .agents/skills è la directory condivisa"
  else
    SKILLS_DIR=".agents/skills"
    SKILLS_DIR_REASON="nessun marker di host: .agents/skills è la directory condivisa"
  fi

  # Host rilevati che non leggono la directory primaria: per ognuno basta la
  # prima directory che legge, e il contenuto ci arriva per symlink.
  EXTRA_DIRS=()
  for host in ${DETECTED_HOSTS[@]+"${DETECTED_HOSTS[@]}"}; do
    if host_dirs_for "$host" | grep -qxF -- "$SKILLS_DIR"; then continue; fi
    candidate="$(host_dirs_for "$host" | head -n 1)"
    if [ "$candidate" = "$SKILLS_DIR" ]; then continue; fi
    if contains "$candidate" ${EXTRA_DIRS[@]+"${EXTRA_DIRS[@]}"}; then continue; fi
    EXTRA_DIRS+=("$candidate")
  done

  if [ "${#EXTRA_DIRS[@]}" -gt 0 ]; then
    warn "host multipli ($hosts): skill in $SKILLS_DIR, collegate in ${EXTRA_DIRS[*]}"
  fi
}

TMP_DIR=""
cleanup() { if [ -n "$TMP_DIR" ]; then rm -rf -- "$TMP_DIR"; fi; }
trap cleanup EXIT

log()  { printf '%s\n' "$*"; }
ok()   { printf '  ok        %s\n' "$*"; }
skip() { printf '  invariato %s\n' "$*"; }
warn() { printf '  attenzione %s\n' "$*" >&2; }
die()  { printf 'errore: %s\n' "$*" >&2; exit 1; }

# ECC_SKILLS_DIR esplicita vince e disattiva rilevamento e collegamenti.
resolve_skills_dir() {
  if [ -n "${ECC_SKILLS_DIR:-}" ]; then
    SKILLS_DIR="$ECC_SKILLS_DIR"
    SKILLS_DIR_REASON="impostata con ECC_SKILLS_DIR"
    EXTRA_DIRS=()
  else
    detect_skills_dir
  fi
  DEST_ROOT="$REPO_ROOT/$SKILLS_DIR"
  LOCK_PATH="$DEST_ROOT/$LOCK_FILE"
}

resolve_skills_dir
usage() {
  awk 'NR == 1 { next } /^[^#]/ { exit } { print }' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

# Ordine in cui invocare le skill del profilo attivo.
plan() {
  case "$ECC_PROFILE" in
    analysis)
      cat <<'PLAN'
Fase 0  Fatti prima delle opinioni      nessuna skill (base: ecc-conventions)
Fase 1  Capacità e lacune di prodotto   product-capability
Fase 2  Qualità tecnica                 frontend-patterns → backend-patterns
Fase 3  Sicurezza e superficie          security-review
Fase 4  Baseline di verifica            verification-loop
Fase 5  Posizionamento                  competitive-platform-analysis
                                        + competitive-report-structure
                                        + market-research (solo con fonti)
Fase 6  Dimensionare gli interventi     change-impact → plan-canvas
Sempre  Consultazione documentazione    documentation-lookup
PLAN
      ;;
    implementation)
      cat <<'PLAN'
Prima   Convenzioni e standard          ecc-conventions → coding-standards
Design  Contratti e API                 api-design
Lato UI Componenti e stato              frontend-patterns
Lato API Handler, errori, timeout       backend-patterns
Sicurezza Input, segreti, CSP           security-review
Codice  Test-first                      tdd-workflow
Chiudi  test / lint / typecheck / build verification-loop
Sempre  Consultazione documentazione    documentation-lookup
PLAN
      ;;
  esac
}

# Hash deterministico del contenuto di una directory (percorsi + contenuti).
dir_hash() {
  local dir="$1"
  (
    cd -- "$dir" || exit 1
    find . -type f -print | LC_ALL=C sort | while IFS= read -r f; do
      printf '%s ' "$f"
      shasum -a 256 "$f" | cut -d' ' -f1
    done
  ) | shasum -a 256 | cut -d' ' -f1
}

# Copia atomica: costruisce accanto alla destinazione e sostituisce solo alla fine.
install_dir() {
  local src="$1" dest="$2" tmp
  tmp="${dest}.tmp.$$"
  rm -rf -- "$tmp"
  mkdir -p -- "$tmp"
  cp -R -- "$src"/. "$tmp"/
  rm -rf -- "$dest"
  mv -- "$tmp" "$dest"
}

# Percorso relativo con cui si raggiunge una skill della directory primaria a
# partire da una directory secondaria (es. ../../.agents/skills/nome).
rel_skill_path() {
  local dir="$1" name="$2" up="" i=0 slashes
  slashes="$(printf '%s' "$dir" | tr -cd '/' | wc -c | tr -d '[:space:]')"
  while [ "$i" -le "$slashes" ]; do
    up="${up}../"
    i=$((i + 1))
  done
  printf '%s%s/%s\n' "$up" "$SKILLS_DIR" "$name"
}

# Collega una skill in una directory secondaria senza duplicarne il contenuto.
# Imposta LINK_STATE a nuovo|invariato|saltato; non tocca percorsi reali già
# presenti e non interrompe lo script.
link_skill() {
  local name="$1" dir="$2" link rel
  link="$REPO_ROOT/$dir/$name"
  rel="$(rel_skill_path "$dir" "$name")"
  if [ -L "$link" ]; then
    if [ "$(readlink "$link")" = "$rel" ]; then
      LINK_STATE=invariato
      return 0
    fi
    rm -f -- "$link"
  elif [ -e "$link" ]; then
    warn "$dir/$name: esiste già e non è un symlink, lasciata intatta"
    LINK_STATE=saltato
    return 0
  fi
  ln -s "$rel" "$link"
  LINK_STATE=nuovo
}

# Rimuove i collegamenti rimasti orfani in una directory secondaria: la skill
# non esiste più nella primaria. Tocca solo symlink che puntano dentro la
# primaria, mai percorsi reali né collegamenti altrui. Imposta PRUNED.
prune_links() {
  local dir="$1" base="$2" entry target
  PRUNED=0
  for entry in "$REPO_ROOT/$dir"/*; do
    [ -L "$entry" ] || continue
    target="$(readlink "$entry")"
    case "$target" in
      "$base"*) ;;
      *) continue ;;
    esac
    [ -e "$entry" ] && continue
    rm -f -- "$entry"
    log "  rimosso  $dir/$(basename -- "$entry") (skill non più in $SKILLS_DIR)"
    PRUNED=$((PRUNED + 1))
  done
}

# Verifica strutturale: SKILL.md presente, frontmatter con name e description.
verify_skill() {
  local dir="$1" name md problems=""
  name="$(basename -- "$dir")"
  md="$dir/SKILL.md"

  [ -d "$dir" ] || { warn "$name: directory mancante"; return 1; }
  [ -f "$md" ] || { warn "$name: SKILL.md mancante"; return 1; }
  [ -s "$md" ] || { warn "$name: SKILL.md vuoto"; return 1; }

  [ "$(head -n 1 "$md")" = "---" ] || problems="$problems frontmatter-assente;"
  head -n 80 "$md" | grep -q '^name:'        || problems="$problems name-mancante;"
  head -n 80 "$md" | grep -q '^description:' || problems="$problems description-mancante;"
  if [ -n "$problems" ]; then
    warn "$name:$problems"
    return 1
  fi
  return 0
}

check_all() {
  local failures=0 present=0 name extra link entry base
  log "Verifica profilo $ECC_PROFILE in $SKILLS_DIR ($SKILLS_DIR_REASON)"
  if [ ! -d "$DEST_ROOT" ]; then
    warn "directory $SKILLS_DIR assente: esegui lo script senza --check"
    return 1
  fi
  for name in "${SELECTED_SKILLS[@]}"; do
    if [ -d "$DEST_ROOT/$name" ]; then
      verify_skill "$DEST_ROOT/$name" || failures=$((failures + 1))
      present=$((present + 1))
    else
      warn "$name: non installata"
      failures=$((failures + 1))
    fi
  done
  for extra in ${EXTRA_DIRS[@]+"${EXTRA_DIRS[@]}"}; do
    for name in "${SELECTED_SKILLS[@]}"; do
      link="$REPO_ROOT/$extra/$name"
      if [ -L "$link" ] && [ -f "$link/SKILL.md" ]; then
        continue
      fi
      warn "$extra/$name: collegamento mancante o rotto (rilancia senza --check)"
      failures=$((failures + 1))
    done
    base="$(rel_skill_path "$extra" "")"
    for entry in "$REPO_ROOT/$extra"/*; do
      [ -L "$entry" ] || continue
      [ -e "$entry" ] && continue
      case "$(readlink "$entry")" in
        "$base"*)
          warn "$extra/$(basename -- "$entry"): collegamento orfano (rilancia senza --check per rimuoverlo)"
          failures=$((failures + 1))
          ;;
      esac
    done
  done
  if [ "$failures" -gt 0 ]; then
    log "Verifica FALLITA ($failures problemi su ${#SELECTED_SKILLS[@]} skill attese)"
    return 1
  fi
  ok "$present/${#SELECTED_SKILLS[@]} skill presenti e valide"
  for extra in ${EXTRA_DIRS[@]+"${EXTRA_DIRS[@]}"}; do
    ok "$extra: ${#SELECTED_SKILLS[@]} symlink a $SKILLS_DIR"
  done
  if [ -f "$LOCK_PATH" ]; then
    log "  lock      $SKILLS_DIR/$LOCK_FILE"
  fi
  return 0
}

# Scarica solo le directory necessarie. Imposta SRC_ROOT.
prepare_source() {
  if [ -n "$ECC_SRC" ]; then
    [ -d "$ECC_SRC" ] || die "ECC_SRC non esiste: $ECC_SRC"
    SRC_ROOT="$(cd -- "$ECC_SRC" && pwd)"
    log "Uso il checkout locale $SRC_ROOT"
    return 0
  fi

  command -v git >/dev/null || die "git non disponibile (o usa ECC_SRC=<checkout locale>)"

  SRC_ROOT="$TMP_DIR/src"
  mkdir -p "$SRC_ROOT"
  log "Partial clone di ${ECC_REPO}@${ECC_REF} (solo blob necessari)"
  git -C "$SRC_ROOT" init -q
  git -C "$SRC_ROOT" remote add origin "https://github.com/${ECC_REPO}.git"
  git -C "$SRC_ROOT" fetch -q --depth 1 --filter=blob:none origin "$ECC_REF" \
    || die "fetch fallito per $ECC_REF"

  # Risolve i percorsi reali: le skill possono stare in skills/ (marketplace,
  # anche annidate per categoria) oppure in .agents/skills/ (repo-native).
  local listing paths="" name candidate
  listing="$(git -C "$SRC_ROOT" ls-tree -r --name-only FETCH_HEAD)"
  for name in "${SELECTED_SKILLS[@]}"; do
    candidate="$(printf '%s\n' "$listing" | grep -E "(^|/)${name}/SKILL\.md$" | LC_ALL=C sort | head -n 1 || true)"
    if [ -z "$candidate" ]; then continue; fi
    candidate="${candidate%/SKILL.md}"
    paths="$paths $candidate"
  done

  if [ -z "$paths" ]; then
    die "nessuna delle skill del profilo $ECC_PROFILE esiste in ${ECC_REPO}@${ECC_REF}"
  fi

  # shellcheck disable=SC2086
  git -C "$SRC_ROOT" sparse-checkout init --cone >/dev/null 2>&1 \
    || git -C "$SRC_ROOT" sparse-checkout init >/dev/null 2>&1
  # shellcheck disable=SC2086
  git -C "$SRC_ROOT" sparse-checkout set $paths
  git -C "$SRC_ROOT" checkout -q FETCH_HEAD
}

do_install() {
  TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ecc-skills.XXXXXX")"
  prepare_source

  mkdir -p "$DEST_ROOT"
  local added=0 updated=0 unchanged=0 missing=0 name src dest new_hash old_hash extra
  local linked=0 relinked=0 link_skipped=0 pruned=0
  local lock_tmp="$TMP_DIR/lock"
  {
    printf '# ecc_skills lock — generato da scripts/setup-ecc-skills.sh\n'
    printf 'repo\t%s\nref\t%s\nprofile\t%s\nskills_dir\t%s\n' \
      "$ECC_REPO" "$ECC_REF" "$ECC_PROFILE" "$SKILLS_DIR"
    printf '# name\thash\torigin\n'
  } > "$lock_tmp"

  log "Installo profilo $ECC_PROFILE in $SKILLS_DIR ($SKILLS_DIR_REASON)"
  for extra in ${EXTRA_DIRS[@]+"${EXTRA_DIRS[@]}"}; do
    mkdir -p "$REPO_ROOT/$extra"
    log "  collego  $extra → $SKILLS_DIR (symlink, nessuna copia)"
  done
  for name in "${SELECTED_SKILLS[@]}"; do
    src=""
    if [ -f "$SRC_ROOT/skills/$name/SKILL.md" ]; then
      src="$SRC_ROOT/skills/$name"
    elif [ -f "$SRC_ROOT/.agents/skills/$name/SKILL.md" ]; then
      src="$SRC_ROOT/.agents/skills/$name"
    else
      src="$(find "$SRC_ROOT" -maxdepth 4 -type d -name "$name" \
             -exec test -f '{}/SKILL.md' \; -print 2>/dev/null | LC_ALL=C sort | head -n 1)"
    fi

    if [ -z "$src" ]; then
      warn "$name: non esiste in ${ECC_REPO}@${ECC_REF}, saltata"
      missing=$((missing + 1))
      continue
    fi

    dest="$DEST_ROOT/$name"
    new_hash="$(dir_hash "$src")"

    # Un symlink non è nostro: non lo si sostituisce con una copia.
    if [ -L "$dest" ]; then
      warn "$name: $SKILLS_DIR/$name è un symlink, lasciato com'è"
      unchanged=$((unchanged + 1))
      continue
    fi

    if [ -d "$dest" ]; then
      old_hash="$(dir_hash "$dest")"
      if [ "$old_hash" = "$new_hash" ]; then
        skip "$name"
        unchanged=$((unchanged + 1))
      else
        install_dir "$src" "$dest"
        ok "$name (aggiornata)"
        updated=$((updated + 1))
      fi
    else
      install_dir "$src" "$dest"
      ok "$name (nuova)"
      added=$((added + 1))
    fi

    verify_skill "$dest" || warn "$name: installata ma con frontmatter sospetto"
    for extra in ${EXTRA_DIRS[@]+"${EXTRA_DIRS[@]}"}; do
      link_skill "$name" "$extra"
      case "$LINK_STATE" in
        nuovo)     linked=$((linked + 1)) ;;
        invariato) relinked=$((relinked + 1)) ;;
        saltato)   link_skipped=$((link_skipped + 1)) ;;
      esac
    done
    printf '%s\t%s\t%s\n' "$name" "$new_hash" "${src#"$SRC_ROOT"/}" >> "$lock_tmp"
  done

  for extra in ${EXTRA_DIRS[@]+"${EXTRA_DIRS[@]}"}; do
    prune_links "$extra" "$(rel_skill_path "$extra" "")"
    pruned=$((pruned + PRUNED))
  done

  mv -- "$lock_tmp" "$LOCK_PATH"

  log ""
  log "Riepilogo: $added nuove, $updated aggiornate, $unchanged invariate, $missing mancanti"
  if [ "${#EXTRA_DIRS[@]}" -gt 0 ]; then
    log "Collegamenti: $linked nuovi, $relinked invariati, $link_skipped saltati, $pruned orfani rimossi (in ${EXTRA_DIRS[*]})"
  fi
  log ""
  check_all || true

  if [ "$missing" -gt 0 ]; then
    log ""
    warn "alcune skill del profilo $ECC_PROFILE non esistono in ${ECC_REPO}@${ECC_REF}:"
    warn "aggiorna la lista del profilo o usa ECC_REF diverso."
  fi

  log ""
  log "Nessun altro file del repository è stato modificato."
  log "Destinazione: $SKILLS_DIR ($SKILLS_DIR_REASON)."
  if [ "${#EXTRA_DIRS[@]}" -gt 0 ]; then
    log "Host rilevati multipli: le altre directory (${EXTRA_DIRS[*]}) contengono solo symlink."
  else
    log "Se il tuo host legge un'altra directory, imposta ECC_SKILLS_DIR e rilancia."
  fi
}

main() {
  case "${1:-}" in
    "")          do_install ;;
    --check)     check_all ;;
    --list)      printf '%s\n' "${SELECTED_SKILLS[@]}" ;;
    --plan)      plan ;;
    --help|-h)   usage ;;
    *)           printf 'opzione non riconosciuta: %s\n' "$1" >&2; usage; exit 2 ;;
  esac
}

main "$@"
