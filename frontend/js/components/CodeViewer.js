/**
 * CodeViewer Component
 * Displays and highlights code snippets with line numbers
 */
class CodeViewer {
    constructor(options = {}) {
        this.options = {
            container: null,
            language: 'html',
            theme: 'vs-dark',
            readOnly: true,
            lineNumbers: true,
            ...options
        };

        this.editor = null;
        this.init();
    }

    init() {
        // Initialize Monaco editor
        require(['vs/editor/editor.main'], () => {
            this.editor = monaco.editor.create(this.options.container, {
                value: '',
                language: this.options.language,
                theme: this.options.theme,
                readOnly: this.options.readOnly,
                lineNumbers: this.options.lineNumbers,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderWhitespace: 'all',
                fontSize: 14
            });

            // Handle container resizing
            window.addEventListener('resize', () => {
                this.editor.layout();
            });
        });
    }

    setValue(code) {
        if (this.editor) {
            this.editor.setValue(code);
        }
    }

    getValue() {
        return this.editor ? this.editor.getValue() : '';
    }

    setLanguage(language) {
        if (this.editor) {
            monaco.editor.setModelLanguage(this.editor.getModel(), language);
        }
    }

    destroy() {
        if (this.editor) {
            this.editor.dispose();
        }
    }
}

export default CodeViewer;