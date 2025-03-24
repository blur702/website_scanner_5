// frontend/js/components/CodeViewer.js
// Code snippet viewer

const CodeViewer = {
  init: () => {
    document.querySelectorAll('.code-viewer').forEach(codeViewer => {
      const codeElement = codeViewer.querySelector('code');
      const copyButton = codeViewer.querySelector('.copy-button');

      if (codeElement) {
        const code = codeElement.textContent;
        const highlightedCode = CodeViewer.highlight(code);
        codeElement.innerHTML = highlightedCode;
      }

      if (copyButton) {
        copyButton.addEventListener('click', () => {
          const code = codeElement.textContent;
          CodeViewer.copyToClipboard(code);
        });
      }
    });
  },
  highlight: (code) => {
    // Basic HTML syntax highlighting
    code = code.replace(/&/g, '&amp;');
    code = code.replace(/</g, '&lt;');
    code = code.replace(/>/g, '&gt;');
    code = code.replace(/"/g, '&quot;');
    code = code.replace(/'/g, '&#039;');
    code = code.replace(/(\/\/.*)/g, '<span class="comment">$1</span>');
    code = code.replace(/(&lt;[a-zA-Z]+&gt;)/g, '<span class="tag">$1</span>');
    return code;
  },
  copyToClipboard: (code) => {
    navigator.clipboard.writeText(code);
    Notification.show('Code copied to clipboard', 'success');
  },
};

window.CodeViewer = CodeViewer;