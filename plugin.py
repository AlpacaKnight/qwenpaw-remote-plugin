"""Compatibility entry point for the Remote SSH plugin."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_BACKEND_PACKAGE = "_qwenpaw_remote_backend"
_BACKEND_DIR = Path(__file__).resolve().parent / "remote"
_BACKEND_INIT = _BACKEND_DIR / "__init__.py"
_BACKEND_PLUGIN = _BACKEND_DIR / "plugin.py"


def _load_backend():
    """Load the backend package without depending on this module's name."""
    package = sys.modules.get(_BACKEND_PACKAGE)
    if package is None:
        package_spec = importlib.util.spec_from_file_location(
            _BACKEND_PACKAGE,
            _BACKEND_INIT,
            submodule_search_locations=[str(_BACKEND_DIR)],
        )
        if package_spec is None or package_spec.loader is None:
            raise ImportError(f"Cannot load backend package from {_BACKEND_INIT}")

        package = importlib.util.module_from_spec(package_spec)
        sys.modules[_BACKEND_PACKAGE] = package
        package_spec.loader.exec_module(package)

    plugin_module_name = f"{_BACKEND_PACKAGE}.plugin"
    plugin_module = sys.modules.get(plugin_module_name)
    if plugin_module is not None:
        return plugin_module

    plugin_spec = importlib.util.spec_from_file_location(
        plugin_module_name,
        _BACKEND_PLUGIN,
    )
    if plugin_spec is None or plugin_spec.loader is None:
        raise ImportError(f"Cannot load backend plugin from {_BACKEND_PLUGIN}")

    plugin_module = importlib.util.module_from_spec(plugin_spec)
    sys.modules[plugin_module_name] = plugin_module
    plugin_spec.loader.exec_module(plugin_module)
    return plugin_module


_backend = _load_backend()
RemotePlugin = _backend.RemotePlugin
plugin = _backend.plugin

__all__ = ["RemotePlugin", "plugin"]
