package auth

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"
)

type JWK struct {
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	Kty string `json:"kty"`
	Use string `json:"use"`
	N   string `json:"n,omitempty"`
	E   string `json:"e,omitempty"`
	Crv string `json:"crv,omitempty"`
	X   string `json:"x,omitempty"`
	Y   string `json:"y,omitempty"`
}

type JWKS struct {
	Keys []JWK `json:"keys"`
}

type jwtHeader struct {
	Kid string `json:"kid"`
	Alg string `json:"alg"`
}

type SupabaseClaims struct {
	Subject string `json:"sub"`
	Email   string `json:"email"`
	Exp     int64  `json:"exp"`
	Iat     int64  `json:"iat"`
}

var (
	jwksProvider *JWKSProvider
	jwksOnce     sync.Once
)

type JWKSProvider struct {
	url       string
	mu        sync.RWMutex
	keys      map[string]any
	lastFetch time.Time
	ttl       time.Duration
}

func GetJWKSProvider() *JWKSProvider {
	jwksOnce.Do(func() {
		jwksProvider = &JWKSProvider{
			url: "https://lqypfqoslyivbtnrfaex.supabase.co/auth/v1/.well-known/jwks.json",
			ttl: 15 * time.Minute,
		}
	})
	return jwksProvider
}

func (p *JWKSProvider) refresh() error {
	resp, err := http.Get(p.url)
	if err != nil {
		return fmt.Errorf("jwks fetch: %w", err)
	}
	defer resp.Body.Close()

	var jwks JWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("jwks decode: %w", err)
	}

	keys := make(map[string]any)
	for _, jwk := range jwks.Keys {
		switch jwk.Kty {
		case "EC":
			key, err := jwkToECKey(jwk)
			if err != nil {
				continue
			}
			keys[jwk.Kid] = key
		case "RSA":
			key, err := jwkToRSAKey(jwk)
			if err != nil {
				continue
			}
			keys[jwk.Kid] = key
		}
	}

	p.mu.Lock()
	p.keys = keys
	p.lastFetch = time.Now()
	p.mu.Unlock()
	return nil
}

func (p *JWKSProvider) GetKey(kid string) (any, error) {
	p.mu.RLock()
	key, ok := p.keys[kid]
	age := time.Since(p.lastFetch)
	p.mu.RUnlock()

	if ok && age < p.ttl {
		return key, nil
	}

	if err := p.refresh(); err != nil {
		if ok {
			return key, nil
		}
		return nil, fmt.Errorf("jwks: %w", err)
	}

	p.mu.RLock()
	key, ok = p.keys[kid]
	p.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("jwks: key %q not found", kid)
	}
	return key, nil
}

func VerifySupabaseToken(tokenString string) (*SupabaseClaims, error) {
	parts := splitToken(tokenString)
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token format")
	}

	headerRaw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("decode header: %w", err)
	}

	var header jwtHeader
	if err := json.Unmarshal(headerRaw, &header); err != nil {
		return nil, fmt.Errorf("parse header: %w", err)
	}

	provider := GetJWKSProvider()
	key, err := provider.GetKey(header.Kid)
	if err != nil {
		return nil, fmt.Errorf("get key: %w", err)
	}

	sigRaw, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, fmt.Errorf("decode signature: %w", err)
	}

	message := parts[0] + "." + parts[1]

	switch k := key.(type) {
	case *ecdsa.PublicKey:
		if err := verifyES256(message, sigRaw, k); err != nil {
			return nil, fmt.Errorf("verify: %w", err)
		}
	case *rsa.PublicKey:
		hash := sha256.Sum256([]byte(message))
		if err := rsa.VerifyPKCS1v15(k, crypto.SHA256, hash[:], sigRaw); err != nil {
			return nil, fmt.Errorf("verify: %w", err)
		}
	default:
		return nil, fmt.Errorf("unsupported key type")
	}

	payloadRaw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("decode payload: %w", err)
	}

	var claims SupabaseClaims
	if err := json.Unmarshal(payloadRaw, &claims); err != nil {
		return nil, fmt.Errorf("parse claims: %w", err)
	}

	return &claims, nil
}

func verifyES256(message string, signature []byte, pubKey *ecdsa.PublicKey) error {
	hash := sha256.Sum256([]byte(message))
	r := new(big.Int).SetBytes(signature[:len(signature)/2])
	s := new(big.Int).SetBytes(signature[len(signature)/2:])
	if !ecdsa.Verify(pubKey, hash[:], r, s) {
		return fmt.Errorf("ecdsa signature invalid")
	}
	return nil
}

func jwkToECKey(jwk JWK) (*ecdsa.PublicKey, error) {
	xRaw, err := base64.RawURLEncoding.DecodeString(jwk.X)
	if err != nil {
		return nil, fmt.Errorf("decode X: %w", err)
	}
	yRaw, err := base64.RawURLEncoding.DecodeString(jwk.Y)
	if err != nil {
		return nil, fmt.Errorf("decode Y: %w", err)
	}

	var curve elliptic.Curve
	switch jwk.Crv {
	case "P-256":
		curve = elliptic.P256()
	default:
		return nil, fmt.Errorf("unsupported curve: %s", jwk.Crv)
	}

	return &ecdsa.PublicKey{
		Curve: curve,
		X:     new(big.Int).SetBytes(xRaw),
		Y:     new(big.Int).SetBytes(yRaw),
	}, nil
}

func jwkToRSAKey(jwk JWK) (*rsa.PublicKey, error) {
	nRaw, err := base64.RawURLEncoding.DecodeString(jwk.N)
	if err != nil {
		return nil, fmt.Errorf("decode N: %w", err)
	}
	eRaw, err := base64.RawURLEncoding.DecodeString(jwk.E)
	if err != nil {
		return nil, fmt.Errorf("decode E: %w", err)
	}
	e := binary.BigEndian.Uint32(append(make([]byte, 4-len(eRaw)), eRaw...))
	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(nRaw),
		E: int(e),
	}, nil
}

func splitToken(token string) []string {
	parts := make([]string, 0, 3)
	start := 0
	for i := 0; i < len(token); i++ {
		if token[i] == '.' {
			parts = append(parts, token[start:i])
			start = i + 1
		}
	}
	parts = append(parts, token[start:])
	return parts
}

func ExtractBearerToken(authHeader string) (string, error) {
	if authHeader == "" {
		return "", fmt.Errorf("authorization header required")
	}
	if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
		return "", fmt.Errorf("invalid authorization format, expected 'Bearer <token>'")
	}
	return authHeader[7:], nil
}
