# PrintCalc (3D Baskı Maliyet ve Satış Fiyatı Hesaplayıcı)

PrintCalc, 3D baskı profesyonelleri ve hobiciler için modern, minimalist ve karanlık mod (Dark Theme) odaklı bir maliyet/satış fiyatı hesaplama uygulamasıdır. React Native ve Expo altyapısı ile inşa edilmiştir.

Bu dosya, uygulamanın tüm yapısal özelliklerini, geliştirme aşamalarını ve çalışma mantığını belgelemektedir.

---

## 🚀 Temel Özellikler ve Mantık

### 1. Gelişmiş Fiyatlandırma Motoru (Pricing Engine)
Uygulama sıradan bir maliyet hesaplayıcısından öteye taşınarak, doğru ticari formüllerle çalışan bir "Satış Fiyatı Hesaplayıcıya" dönüştürülmüştür.
- **Doğru Kâr Dağılımı:** Makine yıpranma payı (saatlik gider) veya hizmet bedeli gibi sabit/katı giderlere "Çarpan Tuzağı" (Multiplier Trap) uygulanması engellenmiştir. Kâr payı, sadece harcanan hammadde (Filament) bedeli üzerinden hesaplanıp sonuca eklenir.
- **Esnek Kâr Modları:** Kullanıcı arayüzüne entegre edilen "Toggle" geçişi ile kâr oranı iki farklı modda girilebilir:
  - **Çarpan (Multiplier) Modu:** `[ x ]` Filament bedelini örneğin 2.5 ile çarparak kâr ekler.
  - **Yüzde (Percentage) Modu:** `[ % ]` Filament bedeline %30, %50 gibi kâr yüzdesi ekler.

### 2. Filament ve Envanter Yönetimi
- **Detaylı Takip:** Filamentin gramajı, fiyatı, kalan stoğu ve türünün (PLA, PETG, ABS vb.) yanı sıra gelişmiş yazıcılar için **Akış Dinamiği (K-Value / K-Değeri)** takip edilebilir.
- **Arama ve Akıllı Listeleme:**
  - Envanter aramasında **Kompakt (Compact) Kartlar** kullanılır.
  - Bu kartların yanındaki "▸" genişletme okuna basıldığında kart aşağı doğru uzayarak; stok doluluk oranını (renkli bir bar şeklinde), birim fiyatını ve varsa `K` değerini şık bir grid (ızgara) içerisinde gösterir.
- **Sık Kullanılanlar:** Sıklıkla tercih edilen filamentlere yıldız (★) eklenip, hızlı erişim paneline sabitlenebilir.

### 3. Modern UI/UX Mimarisi (Dashboard Yapısı)
Hesaplama ekranı ve sonuçlar, klasik bir "alt alta liste" yerine, çok daha kompakt olan sekmeli bir "Dashboard" tarzında sunulur:
- **Hero Alanı:** En üstte "Birim Satış Fiyatı" belirgin, büyük ve vurgulu bir fontla her iki sekmede de görünür kalarak odağı fiyatta tutar.
- **Maliyet Sekmesi (📉):** "Toplam Maliyet", "Birim Maliyet" bilgilerini ve detaylı gider dağılımını (Elektrik, Yıpranma, Hammadde) 2'li grid (yan yana) kart tasarımıyla sergiler.
- **Satış & Kâr Sekmesi (🏷️):** Toplam satış tutarı, net kâr, kâr yüzdesi ve diğer ticari detayları modern kartlar şeklinde gösterir.
- *Tasarım Kuralları:* Göz yoran kalın renkli çerçeveler kullanılmaz. #1C1C1E, #2C2C2E gibi premium koyu gri tonlar tercih edilir.

### 4. Özellikler Menüsü (Action Menu)
Ana ekranın sağ üst köşesinde yer alan kalabalık kaldırılmış, modüler ve genişletilebilir bir **Açılır Bottom Sheet (Panel)** menüsüne taşınmıştır:
- Menü içerisindeki öğeler (Örn: Ürün Kataloğu, Filament Yönetimi) şık sol ikonlar, kalın bir başlık ve hemen altında ne işe yaradığını anlatan silik gri bir alt-metin (description) barındırır.
- Gelecek özelliklere hazırlık amacıyla tasarlanmıştır (Örn: "3D Model İnceleme" (Yakında) etiketi barındıran pasif/yarı-saydam menü butonu).

---

## 🛠 Teknik Altyapı ve Veri Depolama
- **Depolama (AsyncStorage):** Uygulama çevrimdışı (offline) önceliklidir. Filament envanteri, kaydedilen geçmiş katalog ürünleri, varsayılan kâr/gider değerleri tamamen cihazın yerel belleğinde `AsyncStorage` ile tutulur.
- **Veri Normalizasyonu (`normalizeItem`):** Eski uygulamadan gelen veya eksik parametre barındıran nesneler (örneğin kValue'su olmayan eski filamentler), yüklenme esnasında bir normalizasyon fonksiyonundan geçirilerek hata vermesi ve sistem çökmesi engellenir.

---

## 🚀 Yerel (Local) APK Derleme Sistemi (localapk.bat)
EAS (Bulut) sistemine bağlı kalmadan, tamamen bilgisayarın kendi donanım gücünü kullanan ve **Windows'un kronik hatalarını etrafından dolanarak** (Ultimate v5 + Prebuild) çalışan gelişmiş bir derleme scripti `localapk.bat` yazılmıştır:

### Script'in Çözdüğü Kritik Sorunlar ve Yetenekleri:
1. **MAX_PATH (Uzun Yol) Hatası Çözümü:** 
   - Proje masaüstü veya derin klasörlerde ise React Native'in C++ derleyicisinin (260 karakter sınırı yüzünden) çökmesini önler.
   - Bunu sağlamak için tüm proje dosyalarını `robocopy` kullanarak yıldırım hızıyla geçici, izole ve en kısa yol olan `C:\TempBuild_PrintCalc` dizinine senkronize eder. Derlemeyi orada yapar ve bitince APK'yı orijinal klasörünüze geri fırlatır.
2. **Kök Dizin (Root Project Name) Çökme Engellemesi:**
   - Eski `app.json` name değerlerindeki Türkçe/Özel karakter boşluklarının "Failed to notify project evaluation listener" şeklinde Android sistemini çökertmesi önlenmiş (İsim `PrintCalc` yapılmıştır).
3. **SDK Location (local.properties) Hatası Çözümü:**
   - Derleyici arkaplan süreçlerinin (Gradle Worker Daemon) `ANDROID_HOME` dizinini bulamaması ihtimaline karşın; betik Windows ortam değişkenlerinden bu yolu otomatik bulup (Örn: `%LOCALAPPDATA%\Android\Sdk`), ters/çift slash (Escape) düzeltmelerini anlık yaparak sorunsuz bir `local.properties` dosyası üretir.
4. **Gradle OOM (Out of Memory) ve Timeout (Worker Crash) Optimizasyonu:**
   - Derleme sırasında makinelerin %100 yüklenme sebebiyle donmasını veya 120 sn timeout'a düşmesini önlemek için derleme anında bellek sınırları artırılmış (`-Xmx4096m -XX:MaxMetaspaceSize=1024m`) ve çekirdek yüklenmesi kısıtlanmıştır (`org.gradle.workers.max=2`).

> *Uygulamanın APK'sını oluşturmak için tek yapmanız gereken, projenin kök klasöründeki `localapk.bat` dosyasına çift tıklamaktır.*

---

## 👨‍💻 Kurulum ve Geliştirme Ortamı
Bu proje Expo ve React Native tabanlıdır. Node.js yüklü sistemlerde aşağıdaki şekilde çalıştırılır:

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
2. Geliştirici modunu başlatın:
   ```bash
   npx expo start
   ```
3. Yerel APK almak için (Android SDK, ANDROID_HOME gerektirir):
   ```bash
   Ana dizindeki localapk.bat dosyasına tıklayın.
   ```
