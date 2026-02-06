"""
Encryption Service - Handles PII encryption and hashing.

Uses Fernet symmetric encryption for reversible fields (CPF, phone, bank_account)
and SHA256 hashing for irreversible fields (email).

Usage:
    python encryption_service.py
"""
import hashlib
import json
import os
import sys
from base64 import urlsafe_b64encode

# Cryptography library may not be available in all environments.
# Use subprocess check to avoid Rust panics on broken installs.
HAS_CRYPTOGRAPHY = False
Fernet = None
import subprocess as _sp
try:
    _check = _sp.run(
        [sys.executable, "-c", "from cryptography.fernet import Fernet"],
        capture_output=True, timeout=5,
    )
    if _check.returncode == 0:
        from cryptography.fernet import Fernet  # noqa: F811
        HAS_CRYPTOGRAPHY = True
except Exception:
    pass


class DataEncryption:
    def __init__(self, encryption_key=None):
        if HAS_CRYPTOGRAPHY:
            if encryption_key:
                self.key = encryption_key.encode() if isinstance(encryption_key, str) else encryption_key
            else:
                self.key = os.environ.get("ENCRYPTION_KEY", "").encode() or Fernet.generate_key()
            self.cipher_suite = Fernet(self.key)
        else:
            self.key = (encryption_key or os.environ.get("ENCRYPTION_KEY", "dev-key")).encode()
            self.cipher_suite = None

    def encrypt_pii(self, data, field_type):
        sensitive_fields = {
            "cpf": self._encrypt_reversible,
            "phone": self._encrypt_reversible,
            "email": self._hash_email,
            "bank_account": self._encrypt_reversible,
            "payment_info": self._encrypt_reversible,
        }

        handler = sensitive_fields.get(field_type)
        if handler:
            return handler(data)
        return data

    def decrypt_pii(self, encrypted_data):
        if self.cipher_suite and HAS_CRYPTOGRAPHY:
            return self.cipher_suite.decrypt(encrypted_data.encode()).decode()
        # Simple XOR-based fallback for POC (not production-safe)
        return self._simple_decrypt(encrypted_data)

    def _encrypt_reversible(self, data):
        if self.cipher_suite and HAS_CRYPTOGRAPHY:
            return self.cipher_suite.encrypt(data.encode()).decode()
        return self._simple_encrypt(data)

    def _hash_email(self, email):
        return hashlib.sha256(email.encode()).hexdigest()[:16]

    def _simple_encrypt(self, data):
        """Simple fallback encryption for POC when cryptography is not installed."""
        key_bytes = self.key
        data_bytes = data.encode()
        encrypted = bytes(d ^ key_bytes[i % len(key_bytes)] for i, d in enumerate(data_bytes))
        return urlsafe_b64encode(encrypted).decode()

    def _simple_decrypt(self, encrypted_data):
        """Simple fallback decryption for POC."""
        from base64 import urlsafe_b64decode

        key_bytes = self.key
        encrypted_bytes = urlsafe_b64decode(encrypted_data.encode())
        decrypted = bytes(d ^ key_bytes[i % len(key_bytes)] for i, d in enumerate(encrypted_bytes))
        return decrypted.decode()

    @staticmethod
    def mask_document(doc):
        if not doc or len(doc) < 5:
            return "***"
        return f"{doc[:3]}.***.{doc[-2:]}"


if __name__ == "__main__":
    encryption = DataEncryption()

    test_data = {
        "cpf": "12345678901",
        "phone": "+5511999888777",
        "email": "joao.silva@email.com",
        "bank_account": "1234-5678-9012",
    }

    print("=== Encryption Service Demo ===\n")
    for field_type, value in test_data.items():
        encrypted = encryption.encrypt_pii(value, field_type)
        print(f"{field_type}:")
        print(f"  Original:  {value}")
        print(f"  Encrypted: {encrypted}")
        if field_type != "email":
            decrypted = encryption.decrypt_pii(encrypted)
            print(f"  Decrypted: {decrypted}")
        else:
            print(f"  (irreversible hash)")
        print(f"  Masked:    {DataEncryption.mask_document(value)}")
        print()

    result = {field: encryption.encrypt_pii(val, field) for field, val in test_data.items()}
    print(json.dumps(result, indent=2))
