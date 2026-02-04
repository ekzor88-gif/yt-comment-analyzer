document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyze-btn');
  const statusContainer = document.getElementById('status-container');
  const statusText = document.getElementById('status-text');
  const resultContainer = document.getElementById('result-container');
  const resultContent = document.getElementById('result-content');

  const WEBHOOK_URL = 'YOUR_WEBHOOK_URL';

  analyzeBtn.addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    if (!tab.url.includes('youtube.com/watch') && !tab.url.includes('youtu.be/')) {
      showStatus('Пожалуйста, откройте видео на YouTube', false);
      return;
    }

    showStatus('ИИ анализирует комментарии...', true);
    analyzeBtn.disabled = true;
    resultContainer.classList.add('hidden');

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tab.url })
      });

      const data = await response.json();

      // ИЗВЛЕЧЕНИЕ ЧИСТОГО ТЕКСТА
      // Проверяем все возможные варианты, включая твой новый output_text
      let finalMarkdown = "";
      const source = Array.isArray(data) ? data[0] : data;

      if (source.output_text) {
        finalMarkdown = source.output_text;
      } else if (source.output?.text) {
        finalMarkdown = source.output.text;
      } else {
        finalMarkdown = typeof source === 'string' ? source : JSON.stringify(data);
      }

      displayResult(finalMarkdown);
    } catch (error) {
      showStatus(`Ошибка: ${error.message}`, false);
    } finally {
      analyzeBtn.disabled = false;
    }
  });

  function showStatus(text, showSpinner) {
    statusText.textContent = text;
    statusContainer.classList.remove('hidden');
    const spinner = statusContainer.querySelector('.spinner');
    showSpinner ? spinner.classList.remove('hidden') : spinner.classList.add('hidden');
  }

  function displayResult(text) {
    statusContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    // Очищаем текст от возможных экранированных переносов
    const cleanText = text.replace(/\\n/g, '\n');
    resultContent.innerHTML = parseMarkdown(cleanText);
  }

  function parseMarkdown(text) {
    if (!text || typeof text !== 'string') return text;

    return text
      // Заголовки
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Жирный шрифт
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      // Списки (буллеты)
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      // Переносы строк
      .replace(/\n/gim, '<br>')
      // Обертка списков для корректных отступов
      .replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>')
      .replace(/<\/ul><ul>/gim, '');
  }
});