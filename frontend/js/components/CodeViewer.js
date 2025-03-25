/**
 * CodeViewer Component
 * Displays and highlights code snippets with line numbers
 */
class CodeViewer {
    constructor(options = {}) {
        this.options = {
            container: null,
            code: '',
            language: 'text',
            lineNumbers: true,
            copyButton: true,
            wrapLines: false,
            maxHeight: null,
            theme: 'light',
            onCopy: null,
            customClass: '',
            ...options
        };

        this.element = null;
        this.init();
    }

    init() {
        this.createElement();
        if (this.options.container) {
            this.options.container.appendChild(this.element);
        }
        this.setupEventListeners();
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = `code-viewer ${this.options.customClass}`;
        if (this.options.theme) {
            this.element.setAttribute('data-theme', this.options.theme);
        }
        
        this.render();
    }

    render() {
        const lines = this.options.code.split('\n');
        const processedLines = this.processCode(lines);
        const maxLineNumber = lines.length.toString().length;

        this.element.innerHTML = `
            <div class="code-viewer-header">
                ${this.options.language ? `
                    <div class="code-viewer-language">${this.options.language}</div>
                ` : ''}
                ${this.options.copyButton ? `
                    <button class="code-viewer-copy" aria-label="Copy code">
                        <svg class="copy-icon" viewBox="0 0 24 24">
                            <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z"/>
                            <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2"/>
                        </svg>
                        <svg class="check-icon hidden" viewBox="0 0 24 24">
                            <path d="M20 6L9 17l-5-5"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
            <div class="code-viewer-content ${this.options.wrapLines ? 'wrap-lines' : ''}"
                 ${this.options.maxHeight ? `style="max-height: ${this.options.maxHeight}"` : ''}>
                <div class="code-viewer-scroll">
                    ${this.options.lineNumbers ? `
                        <div class="line-numbers" aria-hidden="true">
                            ${lines.map((_, i) => `
                                <span class="line-number" style="width: ${maxLineNumber}ch">
                                    ${i + 1}
                                </span>
                            `).join('')}
                        </div>
                    ` : ''}
                    <pre class="code-viewer-pre"><code>${processedLines}</code></pre>
                </div>
            </div>
        `;
    }

    processCode(lines) {
        // Basic syntax highlighting
        return lines.map(line => {
            let processed = this.escapeHtml(line);

            switch (this.options.language.toLowerCase()) {
                case 'javascript':
                case 'js':
                    processed = this.highlightJavaScript(processed);
                    break;
                case 'html':
                    processed = this.highlightHtml(processed);
                    break;
                case 'css':
                    processed = this.highlightCss(processed);
                    break;
                case 'python':
                    processed = this.highlightPython(processed);
                    break;
            }

            return `<span class="line">${processed}</span>`;
        }).join('\n');
    }

    highlightJavaScript(code) {
        return code
            // Keywords
            .replace(/\b(const|let|var|function|class|extends|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|new|typeof|instanceof|in|of|import|export|default|null|undefined|true|false|this|super|async|await)\b/g, '<span class="token keyword">$1</span>')
            // Strings
            .replace(/(['"`])(.*?)\1/g, '<span class="token string">$1$2$1</span>')
            // Numbers
            .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token number">$1</span>')
            // Comments
            .replace(/(\/\/.*$)/gm, '<span class="token comment">$1</span>')
            .replace(/\/\*[\s\S]*?\*\//g, '<span class="token comment">$&</span>')
            // Functions
            .replace(/(\w+)(?=\s*\()/g, '<span class="token function">$1</span>');
    }

    highlightHtml(code) {
        return code
            // Tags
            .replace(/(&lt;\/?[\w-]+)(&gt;?)?/g, '<span class="token tag">$1$2</span>')
            // Attributes
            .replace(/(\s+[\w-]+)=/g, '<span class="token attr-name">$1</span>=')
            // Attribute values
            .replace(/=(['"])(.*?)\1/g, '=<span class="token attr-value">$1$2$1</span>');
    }

    highlightCss(code) {
        return code
            // Selectors
            .replace(/([^{}]*)({)/g, '<span class="token selector">$1</span>$2')
            // Properties
            .replace(/([\w-]+)(?=\s*:)/g, '<span class="token property">$1</span>')
            // Values
            .replace(/:\s*([^;{}]+)/g, ': <span class="token value">$1</span>')
            // Units
            .replace(/(\d+)(px|em|rem|%|vh|vw|s|ms)/g, '<span class="token number">$1</span><span class="token unit">$2</span>')
            // Comments
            .replace(/\/\*[\s\S]*?\*\//g, '<span class="token comment">$&</span>');
    }

    highlightPython(code) {
        return code
            // Keywords
            .replace(/\b(def|class|if|else|elif|for|while|try|except|finally|with|import|from|as|return|yield|break|continue|pass|raise|True|False|None)\b/g, '<span class="token keyword">$1</span>')
            // Strings
            .replace(/('''[\s\S]*?'''|"""[\s\S]*?""")/g, '<span class="token string">$1</span>')
            .replace(/(['"])(.*?)\1/g, '<span class="token string">$1$2$1</span>')
            // Numbers
            .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="token number">$1</span>')
            // Comments
            .replace(/(#.*$)/gm, '<span class="token comment">$1</span>')
            // Functions
            .replace(/(\w+)(?=\s*\()/g, '<span class="token function">$1</span>');
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    setupEventListeners() {
        if (this.options.copyButton) {
            const copyButton = this.element.querySelector('.code-viewer-copy');
            copyButton.addEventListener('click', async () => {
                await this.copyCode();
            });
        }

        // Handle scroll sync between line numbers and code
        const content = this.element.querySelector('.code-viewer-content');
        content.addEventListener('scroll', () => {
            const lineNumbers = this.element.querySelector('.line-numbers');
            if (lineNumbers) {
                lineNumbers.style.transform = `translateY(-${content.scrollTop}px)`;
            }
        });
    }

    async copyCode() {
        try {
            await navigator.clipboard.writeText(this.options.code);
            
            // Show success state
            const copyButton = this.element.querySelector('.code-viewer-copy');
            const copyIcon = copyButton.querySelector('.copy-icon');
            const checkIcon = copyButton.querySelector('.check-icon');
            
            copyIcon.classList.add('hidden');
            checkIcon.classList.remove('hidden');
            
            setTimeout(() => {
                copyIcon.classList.remove('hidden');
                checkIcon.classList.add('hidden');
            }, 2000);

            if (this.options.onCopy) {
                this.options.onCopy();
            }
        } catch (error) {
            console.error('Failed to copy code:', error);
        }
    }

    setCode(code, language = null) {
        this.options.code = code;
        if (language) {
            this.options.language = language;
        }
        this.render();
    }

    setTheme(theme) {
        this.options.theme = theme;
        this.element.setAttribute('data-theme', theme);
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

// Export for module use
export default CodeViewer;