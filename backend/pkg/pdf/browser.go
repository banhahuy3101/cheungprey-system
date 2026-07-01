package pdf

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"runtime"

	"github.com/chromedp/chromedp"
)

var chromeCandidates = []string{
	"/usr/bin/chromium",
	"/usr/bin/chromium-browser",
	"/usr/bin/google-chrome-stable",
	"/usr/bin/google-chrome",
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
}

// ResolveChromePath finds a Chrome/Chromium binary for headless PDF rendering.
func ResolveChromePath() (string, error) {
	if path := os.Getenv("CHROME_PATH"); path != "" {
		if _, err := os.Stat(path); err == nil {
			return path, nil
		}
		return "", fmt.Errorf("CHROME_PATH %q not found", path)
	}

	for _, candidate := range chromeCandidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
	}

	for _, name := range []string{"chromium", "chromium-browser", "google-chrome-stable", "google-chrome"} {
		if path, err := exec.LookPath(name); err == nil {
			return path, nil
		}
	}

	if runtime.GOOS == "linux" {
		return "", fmt.Errorf("chromium not installed (set CHROME_PATH or use Docker deploy)")
	}
	return "", fmt.Errorf("chrome/chromium not found in PATH")
}

// ChromeAllocator creates a headless Chrome context for HTML→PDF rendering.
func ChromeAllocator(parent context.Context) (context.Context, context.CancelFunc) {
	chromePath, err := ResolveChromePath()
	if err != nil {
		// Fallback keeps local tests working; PDF call will fail with clear error.
		chromePath = ""
	}

	opts := []chromedp.ExecAllocatorOption{
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("allow-file-access-from-files", true),
		chromedp.Flag("disable-extensions", true),
	}
	if chromePath != "" {
		opts = append([]chromedp.ExecAllocatorOption{chromedp.ExecPath(chromePath)}, opts...)
	}

	allocCtx, allocCancel := chromedp.NewExecAllocator(parent, opts...)
	ctx, cancel := chromedp.NewContext(allocCtx)
	return ctx, func() {
		cancel()
		allocCancel()
	}
}
