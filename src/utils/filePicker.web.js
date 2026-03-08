export function pickFile() {
  return new Promise(function (resolve) {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    input.onchange = function (e) {
      const file = e.target.files[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        file: file,
      });
      document.body.removeChild(input);
    };

    input.oncancel = function () {
      resolve(null);
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  });
}
