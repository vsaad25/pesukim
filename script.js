document.addEventListener("DOMContentLoaded", () => {
    const hebrewLetters = [
      "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט",
      "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ",
      "ק", "ר", "ש", "ת"
    ];
  
    const keyboardDiv = document.getElementById("keyboard");
    const inputLetter = document.getElementById("inputLetter");
  
    // Crear botones para el teclado
    hebrewLetters.forEach(letter => {
      const button = document.createElement("button");
      button.textContent = letter;
      button.onclick = () => {
        inputLetter.value = letter; // Escribir la letra en el campo de texto
      };
      keyboardDiv.appendChild(button);
    });
  });
  
  async function fetchBook() {
    const book = document.getElementById("selectBook").value; // Obtener el libro seleccionado
    const letter = document.getElementById("inputLetter").value.trim(); // Letra inicial
    const resultsDiv = document.getElementById("results");
    const results = [];
  
    if (!letter) {
      resultsDiv.textContent = "Por favor, introduce una letra inicial.";
      return;
    }
  
    resultsDiv.textContent = `Buscando pesukim en ${book}... Esto puede tardar un momento.`;
  
    for (let chapter = 1; chapter <= 50; chapter++) {
      const apiUrl = `https://www.sefaria.org/api/texts/${book}.${chapter}?context=0`;
  
      try {
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          const hebrewTexts = data.he; // Versículos en hebreo
  
          if (hebrewTexts) {
            const filteredPesukim = hebrewTexts
              .map((pasuk, index) => ({
                text: pasuk,
                verse: index + 1,
              }))
              .filter(pasuk => pasuk.text.startsWith(letter));
  
            filteredPesukim.forEach(pasuk => {
              results.push(`${book} ${chapter}:${pasuk.verse} - ${pasuk.text}`);
            });
          }
        }
      } catch (error) {
        console.error(`Error al obtener ${book} ${chapter}:`, error);
      }
    }
  
    if (results.length > 0) {
      resultsDiv.innerHTML = `
        <h3>Pesukim que comienzan con '${letter}' en ${book}:</h3>
        <p>${results.join("<br><br>")}</p>
      `;
    } else {
      resultsDiv.textContent = `No se encontraron pesukim que comiencen con '${letter}' en ${book}.`;
    }
  }