package pdf

import (
	"context"
	"os"
	"runtime"

	"github.com/chromedp/chromedp"
)

// ChromeAllocator creates a headless Chrome context for HTML→PDF rendering.
func ChromeAllocator(parent context.Context) (context.Context, context.CancelFunc) {
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("allow-file-access-from-files", true),
	)

	if path := os.Getenv("CHROME_PATH"); path != "" {
		opts = append(opts, chromedp.ExecPath(path))
	} else if runtime.GOOS == "darwin" {
		macChrome := "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
		if _, err := os.Stat(macChrome); err == nil {
			opts = append(opts, chromedp.ExecPath(macChrome))
		}
	} else {
		for _, candidate := range []string{
			"/usr/bin/chromium",
			"/usr/bin/chromium-browser",
			"/usr/bin/google-chrome",
			"/usr/bin/google-chrome-stable",
		} {
			if _, err := os.Stat(candidate); err == nil {
				opts = append(opts, chromedp.ExecPath(candidate))
				break
			}
		}
	}

	allocCtx, allocCancel := chromedp.NewExecAllocator(parent, opts...)
	ctx, cancel := chromedp.NewContext(allocCtx)
	return ctx, func() {
		cancel()
		allocCancel()
	}
}
