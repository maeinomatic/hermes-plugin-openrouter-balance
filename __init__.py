# OpenRouter Balance plugin package.
# The agent side registers nothing — all UI lives in the desktop half and the
# data API in dashboard/plugin_api.py; this register() exists so the native
# plugin contract (manifest + register) is satisfied.
def register(ctx):
    pass
