#!/usr/bin/env python3
"""Print how the legacy API links contacts to companies (diagnostic)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "migrate"))
import legacy_api_import as L

L.TOKEN = L.call("POST", "/auth/login-as-admin", {"email": os.environ["LEGACY_ADMIN_EMAIL"],
                                                  "password": os.environ["LEGACY_ADMIN_PASSWORD"]}).get("token")
companies = L.call("GET", "/company").get("companies", [])
print("companies:", len(companies), "with contacts:", sum(1 for c in companies if c.get("contacts")))
print("sample company keys:", sorted(companies[0].keys()) if companies else None)
for c in companies:
    for u in c.get("contacts") or []:
        print(f"{c.get('name')!r:45} sm8={c.get('service_mate_uuid')}  guid={c.get('guid')}  <- {u.get('name')!r} {u.get('type')} keys={sorted(k for k in u.keys() if 'compan' in k or 'uuid' in k)} company_uuid={u.get('company_uuid') or u.get('company_guid') or (u.get('company') or {}).get('guid') if isinstance(u.get('company'), dict) else u.get('company_uuid')}")
for c in companies:
    if "broadland digital" in (c.get("name") or "").lower():
        print("BROADLAND DIGITAL:", {k: c.get(k) for k in ("guid", "name", "service_mate_uuid")}, "contacts:", len(c.get("contacts") or []))
