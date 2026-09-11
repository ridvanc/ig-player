# IG Video Controls

Chrome extension that adds a real video player UI to Instagram web (feed, reels, stories, post pages).

## Kurulum

1. Chrome'da `chrome://extensions` aç.
2. Sağ üstten **Developer mode**'u aç.
3. **Load unpacked** > bu klasörü seç.
4. instagram.com'u yenile.

## Ne yapar

İki mod var (extension ikonundaki popup'tan seçilir):

**Özel panel (varsayılan)** — Instagram'a uyan bir oynatıcı paneli:
- Seek bar Instagram'ın story-ring gradyanıyla doluyor; renk videonun neresinde olduğunu gösteriyor.
- Seek bar üzerinde gezinince zaman + önizleme karesi (izlediğin kısımlardan toplanır).
- Oynat, ±5 sn, ses (hover'da açılan slider, tekerlekle ayar), hız menüsü (tekerlekle de değişir), PiP, tam ekran.
- Tooltip'ler kısayol tuşunu da gösterir.
- Fare durunca panel gizlenir, alt kenarda ince bir ilerleme çizgisi kalır.
- Klavye aksiyonlarında ortada geri bildirim (oynat/duraklat diski, biriken "+10 sn" göstergesi, ses yüzdesi).
- Dar oynatıcılarda ikincil butonlar otomatik gizlenir (klavye hâlâ çalışır).

Panel tarayıcının *top layer*'ında çizilir (Popover API), yani Instagram'ın hiçbir overlay'i üstüne çıkamaz. Instagram'ın DOM'una dokunmaz.

**Chrome kontrolleri** — Videoya Chrome'un kendi oynatıcı kontrollerini açar ve Instagram'ın videoyu kaplayan şeffaf tıklama katmanlarını tıklamayı geçirir hale getirir. Carousel okları gibi kontrol şeridinin üstündeki küçük butonlar çalışmaya devam eder; kontrol şeridine denk gelen Instagram butonları (ör. mute) devre dışı kalır, onların yerine Chrome'unkiler var.

**Temiz tam ekran (`F` / ⛶)** — Her iki modda da video elementinin kendisi Chrome kontrolleriyle tam ekran olur; Instagram'dan hiçbir şey ekranda kalmaz.

## Kısayollar

| Tuş | İş |
|---|---|
| `Space` / `K` | Oynat / durdur |
| `←` `→` | 5 sn geri / ileri (popup'tan ayarlanır) |
| `J` `L` | 10 sn geri / ileri |
| `M` | Mute |
| `F` | Temiz tam ekran (Chrome kontrolleri) |
| `P` | Picture-in-picture |
| `<` `>` | Hız azalt / artır |
| `,` `.` | Kare kare |
| `0`–`9` | Videonun %0–%90'ına atla |
| `Home` / `End` | Başa / sona |

Kısayollar, ekranda en çok görünen videoya uygulanır. Yorum/DM kutusuna yazarken devre dışı kalır.

## Ayarlar

Popup: aç/kapa, kontrol tipi, bar'ı hep göster, bar konumu (video içi alt/üst, videonun altında), sağ boşluk (Instagram'ın köşe butonu için), seek adımı, varsayılan hız.

## Notlar

- Instagram DOM'u sürekli yeniden render ediyor; MutationObserver bar'ı yeniden bağlıyor.
- Bar'a yapılan tıklamalar Instagram'ın document/window dinleyicilerine ulaşmaz ("dışarı tıklayınca postu kapat" gibi davranışlar tetiklenmez).
- Uzun videolarda seek, sadece indirilmiş segmentlerde anında çalışır; ötesine atlarken kısa bir bekleme normal.
