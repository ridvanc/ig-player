# Chrome Web Store'a yükleme rehberi

Bu extension'ı Chrome Web Store'da yayınlamak için adım adım yapılacaklar. Mağaza metinleri ve izin gerekçeleri en altta, kopyala-yapıştır hazır.

---

## 0. Önce düzeltilmesi gerekenler

Eklenti artık tüm sitelerde çalışan genel bir video kontrolcüsü. Bu, incelemede en kritik noktayı değiştirdi: geniş host izni (madde 3).

| # | Sorun | Neden önemli | Yapılacak |
|---|---|---|---|
| 1 | ~~İkon yok~~ ✅ | Paket 128×128 ikon olmadan mağazaya yüklenemez | Yapıldı: `icons/` (16, 32, 48, 128 PNG + SVG kaynakları), manifest'e bağlandı |
| 2 | ~~İsimde "IG"/"Instagram" var~~ ✅ | Instagram, Meta'nın tescilli markası | Ad "Video Controls" oldu. Çok genel bir ad; istersen daha ayırt edici bir isim seç, marka sorunu kalmadı |
| 3 | **`matches: *://*/*` geniş izin** | Tüm sitelerde çalışmak "hassas izin" sayılıyor: inceleme çok daha sıkı ve uzun, kurulumda "tüm sitelerdeki verilerinizi okuyabilir" uyarısı çıkıyor | Kaçınılmaz, kapsam bu. Gerekçe metni aşağıda. Red gelirse alternatif: `optional_host_permissions` + site başına izin |
| 4 | `all_frames: true` | Gömülü oynatıcılar iframe içinde. Genel kapsam için gerekli | Bilinçli açık |
| 5 | ~~İkon Instagram logosuna benzememeli~~ ✅ | Taklit (impersonation) politikası | Karşılandı: koyu karo + play + seek bar motifi; kamera yok, gradyan sadece ilerleme çizgisinde |

Şu anki manifest (özet):

```json
{
  "name": "Video Controls",
  "description": "Adds a seek bar, speed, volume and keyboard shortcuts to videos on sites that hide them.",
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["*://*/*"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle",
      "all_frames": true
    }
  ]
}
```

Kurallar:
- `description` en fazla **132 karakter**.
- Her yeni yüklemede `version` artmalı (1.0.0 → 1.0.1).

---

## 1. Geliştirici hesabı (bir kere)

1. Google hesabında **2 adımlı doğrulamayı** aç. Zorunlu.
2. https://chrome.google.com/webstore/devconsole adresine git.
3. Geliştirici sözleşmesini kabul et, **tek seferlik 5 USD** kayıt ücretini öde.
4. **Account** sekmesi:
   - Yayıncı adı (mağazada görünecek isim).
   - İletişim e-postası. Doğrulama maili gelir, onayla. Onaylanmadan yayın yapılamaz.
   - **Trader / non-trader beyanı** (AB Dijital Hizmetler Yasası). Ücretsiz, hobi amaçlı yayınlıyorsan genelde *non-trader*. Ticari faaliyetse *trader* seç; adres ve telefon herkese açık gösterilir.

---

## 2. ZIP paketi

`manifest.json` ZIP'in **kök dizininde** olmalı, alt klasörde değil.

```bash
# proje klasöründe çalıştır
zip -r ../video-controls-1.0.0.zip manifest.json content.js content.css popup.html popup.js icons/*.png -x "*.DS_Store"
```

Pakete koyma: `README.md`, `PUBLISHING.md`, `icons/*.svg` (kaynak dosyalar), test dosyaları, `.git`.

Yüklemeden önce son kontrol: `chrome://extensions` → Load unpacked → aynı klasör → Instagram'da dene. Konsolda hata olmamalı.

---

## 3. Mağaza görselleri

| Görsel | Boyut | Zorunlu mu | Not |
|---|---|---|---|
| Mağaza ikonu | 128×128 PNG | Evet | Hazır: `icons/128.png` (96×96 çizim + 16 px şeffaf boşluk, mağaza kuralına uygun) |
| Ekran görüntüsü | 1280×800 veya 640×400 | En az 1, en fazla 5 | Köşeleri yuvarlatma, kenarlık ekleme; tam boy |
| Küçük tanıtım görseli | 440×280 | Dashboard zorunlu tutuyor | Az yazı, ikon + tek cümle |
| Marquee | 1400×560 | Hayır | Öne çıkarılmak için gerekli |

Ekran görüntüsü önerileri:
1. Reel üzerinde panel açık, seek bar yarıda, gradyan görünüyor.
2. Seek bar'da gezinirken önizleme karesi.
3. Hız menüsü açık.
4. Popup ayarları.

Dikkat: Başkalarının reels/fotoğraflarını ekran görüntüsünde kullanma (telif ve kişisel veri). Kendi videonu ya da izinli içerik kullan veya içeriği bulanıklaştır. Instagram logosunu öne çıkarma.

---

## 4. Dashboard'da ürün oluşturma

**New item → ZIP'i yükle.** Ardından sekmeler:

### 4a. Store listing
- **Description**: aşağıdaki hazır metin.
- **Category**: *Productivity* veya *Tools*. Chrome Web Store kategorileri zaman zaman değişiyor, video/eğlence için en uygun olanı seç.
- **Language**: İngilizce (birincil) + istersen Türkçe ek listeleme.
- Görseller (Bölüm 3).
- İsteğe bağlı: web sitesi ve destek URL'si (GitHub repo linki yeterli).

### 4b. Privacy (en çok red buradan gelir)
- **Single purpose**: hazır metin aşağıda.
- **Permission justification**: her izin için ayrı kutu. Hazır metinler aşağıda.
- **Remote code**: *"No, I am not using remote code"*. Extension dışarıdan script yüklemiyor; `fetch`/`eval` yok.
- **Data usage**: hiçbir kutuyu işaretleme. Extension kullanıcı verisi toplamıyor, göndermiyor. `chrome.storage.sync` sadece extension ayarlarını tutuyor.
- Üç sertifika kutusunu işaretle (veri satmıyorum / amaç dışı kullanmıyorum / kredi için kullanmıyorum).
- **Privacy policy URL**: veri toplamayan extension için teknik olarak şart değil ama koy. Red riskini düşürür. Aşağıdaki metni bir GitHub Gist veya GitHub Pages sayfasına koyup linki ver.

### 4c. Distribution
- **Visibility**:
  - *Unlisted*: sadece linki olan kurabilir. İlk yayında önerilir, arkadaşlarla test et.
  - *Public*: mağazada aranabilir.
- **Regions**: tüm bölgeler.
- Ücretsiz.

### 4d. Submit for review
- "Publish automatically after approval" seçeneğini kapatırsan onaydan sonra yayın zamanını sen seçersin.
- İnceleme süresi genelde **birkaç gün**. Instagram gibi popüler bir siteye script enjekte ettiği için daha uzun sürebilir. Birkaç haftayı geçerse destek formundan sorulabilir.

---

## 5. Sık red sebepleri ve bu projedeki durumu

| Red sebebi | Bu projede |
|---|---|
| Marka/isim ihlali | ⚠️ Adı değiştir (Bölüm 0, madde 2) |
| Geniş izin | ⚠️ `*://*/*`. API izni sadece `storage`. İncelemenin en riskli noktası, gerekçeyi iyi yaz |
| Eksik/uyumsuz gizlilik beyanı | Aşağıdaki metinlerle doldur |
| Açıklamanın işlevle uyuşmaması, anahtar kelime doldurma | Hazır metin sade, sorun yok |
| Obfuscated (karartılmış) kod | Kod okunabilir, sorun yok |
| Uzaktan kod çalıştırma | Yok, sorun yok |
| Çalışmayan ürün | İncelemeci hangi sayfada deneyeceğini bilmeli. Açıklamaya "kontrolsüz bir video içeren herhangi bir sayfayı aç" notu ve test için örnek bir URL ekle |

Red gelirse e-postada politika maddesi yazar. Düzelt, `version` artır, yeniden gönder.

---

## 6. Güncelleme yayınlama

1. Kodu değiştir, `manifest.json` → `version` artır.
2. Yeni ZIP oluştur.
3. Dashboard → ürün → **Package** → *Upload new package*.
4. Submit for review. Kullanıcılara onaydan sonra otomatik gider.

Yeni bir izin eklersen, Chrome kullanıcılarda extension'ı devre dışı bırakıp yeniden onay ister. İzin eklemekten kaçın.

---

## Hazır metinler

### Kısa açıklama (manifest `description`, ≤132 karakter)

```
Adds a seek bar, speed, volume and keyboard shortcuts to videos on sites that hide them.
```

### Detaylı açıklama (Store listing → Description)

```
Plenty of sites embed video with no controls at all, or bury the player under their own overlays. Video Controls gives every video on the web a real player.

• Seek bar – drag to any moment. Hover to see the time and a preview of frames you've already watched.
• Playback speed – 0.25× to 3×, from a menu or the scroll wheel.
• Volume slider and mute.
• Skip back / forward buttons.
• Picture-in-picture and clean fullscreen with Chrome's native player.
• Keyboard shortcuts: Space/K play-pause, ←/→ seek, J/L ±10 s, M mute, F fullscreen, P picture-in-picture, < > speed, , . frame step, 0–9 jump.
• Auto-hides while you watch and leaves a thin progress line.
• Optional: use Chrome's own video controls instead.

It stays out of the way: videos that already have controls, videos inside third-party players, and sites with a full player of their own (YouTube, Netflix, Twitch, Vimeo and others) are left alone. Every site can be switched on or off from the toolbar popup.

Privacy: Video Controls collects no data. It sends nothing anywhere and only stores your own settings in Chrome.

Not affiliated with, endorsed or sponsored by any of the sites named above.
```

### Single purpose

```
Adds playback controls (seek bar, speed, volume, keyboard shortcuts) to HTML video elements on web pages.
```

### Permission justification: `storage`

```
Saves the user's own settings for this extension (on/off, control style, bar position, seek step, default speed, and the per-site on/off list) with chrome.storage.sync. No other data is stored.
```

### Host access justification (`*://*/*`) — en önemli kutu

```
The extension's only function is to draw video controls over <video> elements, and a video can appear on any website, so the content script must run wherever one might be. It reads nothing from the page except the video elements' playback state (duration, current time, volume) and the geometry needed to position the controls. It does not read page text, form fields, cookies or account data, makes no network requests, and sends nothing anywhere. Sites that ship their own player are excluded by default and the user can switch any site on or off from the popup.
```

### Gizlilik politikası (Gist / GitHub Pages)

```
Privacy Policy – Video Controls

Last updated: <DATE>

Video Controls does not collect, store, transmit or sell any personal data.

- The extension only interacts with <video> elements on the pages you visit, in order to draw playback controls over them.
- It makes no network requests and loads no remote code.
- It saves only its own settings (on/off, control style, bar position, seek step, default speed, per-site on/off list) with Chrome's built-in storage (chrome.storage.sync). These settings may sync between your own Chrome browsers through your Google account and are never sent to the developer.
- No analytics, tracking or third-party services are used.

Contact: <EMAIL>
```
