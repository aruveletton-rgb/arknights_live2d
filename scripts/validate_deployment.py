"""Validate two-VM deployment environment files without revealing secrets."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise ValueError(f"{path}:{line_number}: expected KEY=VALUE")
        key, value = line.split("=", 1)
        key = key.strip()
        if not key or any(character.isspace() for character in key):
            raise ValueError(f"{path}:{line_number}: invalid key")
        values[key] = value.strip().strip('"').strip("'")
    return values


def check_required(values: dict[str, str], keys: tuple[str, ...], label: str, errors: list[str]) -> None:
    for key in keys:
        if key not in values:
            errors.append(f"{label}: missing {key}")


def validate(vm1_path: Path, vm2_path: Path, production: bool, allow_example: bool) -> int:
    errors: list[str] = []
    try:
        vm1 = load_env(vm1_path)
        vm2 = load_env(vm2_path)
    except (OSError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2

    check_required(vm1, ("PRIMARY_TTS_URL", "PRIMARY_ASR_URL", "API_TOKEN", "VM1_DOMAIN"), "VM-1", errors)
    check_required(vm2, ("VM2_DOMAIN", "TTS_MOCK_FAILURE", "ASR_MOCK_FAILURE"), "VM-2", errors)

    for label, values in (("VM-1", vm1), ("VM-2", vm2)):
        for key, value in values.items():
            if "\n" in value or "\r" in value:
                errors.append(f"{label}: {key} contains a line break")

    if production:
        token = vm1.get("API_TOKEN", "")
        if len(token) < 16:
            errors.append("VM-1: production API_TOKEN must contain at least 16 characters")
        for key in ("VM1_DOMAIN",):
            value = vm1.get(key, "")
            if not value or value in {"localhost", "127.0.0.1", "0.0.0.0"}:
                errors.append(f"VM-1: production {key} must be a real DNS name")
        value = vm2.get("VM2_DOMAIN", "")
        if not value or value in {"localhost", "127.0.0.1", "0.0.0.0"}:
            errors.append("VM-2: production VM2_DOMAIN must be a real DNS name")
        for key in ("PRIMARY_TTS_URL", "PRIMARY_ASR_URL"):
            value = vm1.get(key, "")
            if not value or any(placeholder in value for placeholder in ("vm2/", "localhost", "127.0.0.1")):
                errors.append(f"VM-1: production {key} must target VM-2's reachable HTTPS or private URL")
    elif not allow_example:
        print("INFO: development validation allows localhost and an empty API_TOKEN only with --allow-example")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    mode = "production" if production else "development"
    print(f"Deployment environment validation passed ({mode}); secrets were not printed.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vm1-env", type=Path, required=True)
    parser.add_argument("--vm2-env", type=Path, required=True)
    parser.add_argument("--production", action="store_true")
    parser.add_argument("--allow-example", action="store_true")
    args = parser.parse_args()
    return validate(args.vm1_env, args.vm2_env, args.production, args.allow_example)


if __name__ == "__main__":
    raise SystemExit(main())
