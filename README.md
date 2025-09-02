# generator-fake

Sebuah package Node.js untuk membuat gambar secara dinamis menggunakan Node Canvas.

## Fitur
- Generate Quotes dengan custom fontSize, maxWidth. (tidak support emoji. (sengaja))
- Generate meme dengan custom fontSize, customPadding, custom square/normal size.
- Generate fake chat iphone. simple saja. 
- Generate fake story dengan foto profil, username, dan caption.
- Generate fake tweet dengan avatar, nama, username, status verified, dan teks.
- Dukungan penuh untuk emoji (akan dirender sebagai gambar).
- Penyesuaian ukuran font otomatis pada story.
- Latar belakang dan warna kustom untuk tweet.

## Instalasi
```bash
npm install generator-fake
```

## Penggunaan

### Generate Fake Story
```javascript
const { generateFakeStory } = require('generator-fake');
const fs = require('fs');

async function createStory() {
  try {
    // Buffer gambar profil bisa didapat dari fs.readFile, fetch url.
    const profilePicBuffer = await fs.readFile('./assets/fotobot.jpeg');
    const imageBuffer = await generateFakeStory({
      username: 'kamu.Crot??',
      caption: 'ngetes aja dulu ya ga?? 🚀✨',
      profilePicBuffer: profilePicBuffer
    });
    await fs.writeFile('./fake_story.png', imageBuffer);
    console.log('Fake story berhasil dibuat!');
  } catch (error) {
    console.error('Gagal membuat story:', error);
  }
}

createStory();
```

### Generate Fake Tweet
```javascript
const { generateFakeTweet } = require('generator-fake');
const fs = require('fs');

async function createTweet() {
  try {
    const imageBuffer = await generateFakeTweet({
      user: {
        displayName: "kamu crot",
        username: "kamu_crot"
      },
      comment: "ngetes aja dulu ya ga?? 🚀✨",
      avatarUrl: './assets/fotobot.jpeg', // Bisa juga path lokal atau URL atau buffer
      verified: true,
      backgroundColor: '#15202b'
    });
    await fs.writeFile('./fake_tweet.png', imageBuffer);
    console.log('Fake tweet berhasil dibuat!');
  } catch (error) {
    console.error('Gagal membuat tweet:', error);
  }
}

createTweet();
```

### Generate Fake Chat Iphone / IQC
```javascript
const { generateFakeChatIphone } = require('generator-fake');
const fs = require('fs');

async function createFakeChat() {
  try {
    const quoteOptions = {
      text: "Test Buat Iphone Fake Chat 🤔🤔",
      chatTime: "21:55",
      statusBarTime: "21:57"
    };
    const quoteBuffer = await generateFakeChatIphone(quoteOptions);
    if (quoteBuffer) {
      await fs.writeFile('hasil.png', quoteBuffer);
      console.log('Fake Chat Iphone berhasil dibuat!');
    }

  } catch (error) {
    console.error("Terjadi kesalahan saat membuat gambar:", error);
  }
}

createTweet();
```

### Generate Meme
```javascript
const { generateMeme } = require('generator-fake');
const fs = require('fs');

(async () => {
  // original + custom fontSize + padding
  const path = './susu.jpg';
  const gen1 = await generateMeme(path, '🤬 Top 🤬 Meme 🤬', '🤬 Bot 🤬 Meme 🤬', { 
    fontSize: 65,
    topPadding: 80,
    bottomPadding: 80,
  });
  fs.writeFileSync('genMeme-normal.png', gen1);

  // square + custom fontSize
  const path = './susu.jpg';
  const gen2 = await generateMeme(path, '🤬 Ngapain 🤬 Kamu 🤬', '🤬', { 
    fontSize: 65,
    square: true,
  });
  fs.writeFileSync('genMeme-square.png', gen2);
})();
```

### Generate Quote
```javascript
const fs = require("fs");
const { generateQuote } = require('generator-fake');

(async () => {
  const path = './susu.jpg';
  const buffer = await generateQuote(
    path, // gambar background
    "Sekali melangkah dilarang putar arah apalagi menyerah.", // teks quote
    {
      fontSize: 30,
      maxWidth: 300,  // opsional, lebar maksimal teks sebelum dipindah baris
    }
  );
  fs.writeFileSync("quotes.png", buffer);
})();
```