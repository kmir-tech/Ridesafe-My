export type Lang = "en" | "bm";

export const translations = {
  en: {
    // App
    appName: "RideSafe MY",
    appSubtitle: "Motorcycle Weather Safety",
    appRegion: "Malaysia",

    // Tabs
    tabWeather: "Weather",
    tabRoute: "Route Check",

    // Location
    selectLocation: "Select a location to view weather",
    yourLocation: "Your location detected",
    useMyLocation: "Use My Location",
    locating: "Locating...",
    permissionDenied: "Location access denied. Please select a city below.",
    nearestCity: "Showing nearest city:",

    // Weather card
    goodConditions: "Good conditions for riding!",
    rideCaution: "Ride carefully - watch for slippery roads",
    avoidRiding: "Avoid riding - conditions are hazardous",
    updated: "Updated:",
    cached: "(cached)",

    // Weather stats
    temp: "Temp",
    rain: "Rain",
    wind: "Wind",
    humidity: "Humidity",
    visibility: "Visibility",
    rainType: "Rain Type",

    // Forecast
    bestTimeToRide: "Best Time to Ride",
    noGoodWindow: "No ideal window in next 24h",
    recommendedWindow: "Recommended window:",
    safestHour: "Safest hour:",
    forecastTimeline: "24-Hour Forecast",
    loading: "Loading...",
    loadingForecast: "Loading forecast...",

    // Route check
    routeCheck: "Route Check",
    from: "From",
    to: "To",
    selectStart: "Select start location",
    selectDest: "Select destination",
    searchLocation: "Search location...",
    checkRouteSafety: "Check Route Safety",
    checkingRoute: "Checking route...",
    pickStartOnMap: "Set start on map",
    pickEndOnMap: "Set end on map",
    routeStartUnset: "No route start selected yet",
    routeEndUnset: "No route end selected yet",
    tapMapToPlaceStart: "Tap the map to place your route start pin.",
    tapMapToPlaceEnd: "Tap the map to place your route end pin.",
    clearRoute: "Clear route",
    dragPinsHint: "Use the A and B pins on the map to fine-tune your route.",
    routeRisk: "Route Risk",
    routeWeatherHeadline: "Weather Along This Route",
    routeWeatherSubhead: "Rain, temperature, wind, and the worst stretch come first.",
    routeSummary: "Route Summary",
    maxRain: "Max Rain",
    tempRange: "Temp Range",
    windRange: "Wind Range",
    worstStretch: "Worst Stretch",
    score: "Score",
    savedRoutes: "Saved Routes",
    saveRoute: "Save this route",
    routeAlreadySaved: "Route already saved",
    swapLocations: "Swap locations",

    // Monsoon
    monsoonHigh: "High Monsoon Risk",
    monsoonModerate: "Monsoon Season",
    monsoonCaution: "Inter-monsoon Period",
    dismiss: "Dismiss",

    // Sharing
    shareWeather: "Share",
    shareTitle: "RideSafe MY — Weather Safety",
    shareViaWhatsApp: "Share via WhatsApp",
    shareViaTelegram: "Share via Telegram",
    shareCard: "Share Card",
    copied: "Copied!",

    // Offline / PWA
    offlineBanner: "You are offline. Showing cached data.",
    installApp: "Install App",
    installPrompt: "Add RideSafe MY to your home screen",
    install: "Install",
    notNow: "Not now",

    // Address search
    searchAddress: "Search a city or address...",
    noResults: "No results found",
    searching: "Searching...",

    // Errors
    tryAgain: "Please try again later",
    failedWeather: "Failed to fetch weather",
    failedRoute: "Failed to check route",

    // Safety levels
    safe: "Safe",
    caution: "Caution",
    dangerous: "Dangerous",

    // Auth
    signIn: "Sign In",
    signUp: "Sign Up",
    signOut: "Sign Out",
    email: "Email",
    password: "Password",
    displayName: "Display Name",
    continueWithGoogle: "Continue with Google",
    signingIn: "Signing in...",
    signingUp: "Signing up...",
    authError: "Authentication failed. Please try again.",
    syncCTA: "Sign in to sync across devices",
    profile: "Profile",
    rideHistory: "Ride History",

    // Incidents
    reportIncident: "Report Hazard",
    incidentType: "Hazard Type",
    incidentDescription: "Description (optional)",
    incidentDescPlaceholder: "Brief details about this hazard...",
    submitIncident: "Submit Report",
    submitting: "Submitting...",
    incidentFlood: "Flooding",
    incidentAccident: "Accident",
    incidentRoadDamage: "Road Damage",
    incidentFallenTree: "Fallen Tree",
    incidentOilSpill: "Oil Spill",
    incidentPoliceRoadblock: "Police Roadblock",
    incidentTrafficJam: "Traffic Jam",
    incidentOther: "Other",
    tapMapToReport: "Long-press the map to place a report",
    upvote: "Confirm",
    incidentsNearby: "hazard(s) on this route",
    showIncidents: "Hazards",
    hideIncidents: "Hazards",
    noIncidents: "No active hazards reported",

    // AI Advisor
    aiAdvisor: "AI Riding Advisor",
    aiAdvisorBeta: "Beta",
    aiAdvisorPlaceholder: "Ask about riding conditions...",
    aiAdvisorSend: "Ask",
    aiAdvisorRateLimit: "Daily limit reached. Come back tomorrow.",
    aiAdvisorQueriesLeft: "queries left today",
    aiAdvisorDisclaimer: "AI advice is supplementary — always use your own judgement.",
    suggestedQ1: "Is it safe to ride right now?",
    suggestedQ2: "Best time to ride today?",
    suggestedQ3: "What's causing the low score?",
    suggestedQ4: "Any hazards on my route?",

    // Ride Log
    logThisRide: "Log This Ride",
    rideLoggedSuccess: "Ride logged!",
    noRideLogs: "No rides logged yet",
    rideLogCTA: "Sign in to keep a ride logbook",
    totalRides: "Total Rides",
    avgSafetyScore: "Avg Safety",
    mostFrequentRoute: "Top Route",
    addNotes: "Add notes (optional)",
    notes: "Notes",

    // Notifications
    notifications: "Notifications",
    noNotifications: "No notifications yet",
    markAllRead: "Mark all read",
    unread: "unread",
    enablePushAlerts: "Enable Alerts",
    pushAlertsEnabled: "Alerts On",
    pushAlertsUnsupported: "Push alerts not supported on this browser",
    routeAlertTitle: "Route Safety Alert",

    // Navigation handoff
    openInWaze: "Open in Waze",
    openInGoogleMaps: "Open in Maps",

    // Heatmap
    showHeatmap: "Heatmap",
    hideHeatmap: "Heatmap",
    quickCityShortcuts: "Quick city shortcuts",
    heatmapGuide: "Heatmap guide",
    safer: "Safer",
    riskier: "Riskier",
    mapPrimaryHint: "Search a place or tap a marker to inspect live weather.",
    routePlacementHint: "Tap From or To below, then choose a point on the map.",
    routePlacementScrollHint: "The map will scroll into view automatically so you can place the pin.",
    searchStartRoute: "Type or search your start point",
    searchEndRoute: "Type or search your destination",
  },
  bm: {
    // App
    appName: "RideSafe MY",
    appSubtitle: "Keselamatan Cuaca Motosikal",
    appRegion: "Malaysia",

    // Tabs
    tabWeather: "Cuaca",
    tabRoute: "Semak Laluan",

    // Location
    selectLocation: "Pilih lokasi untuk melihat cuaca",
    yourLocation: "Lokasi anda dikesan",
    useMyLocation: "Guna Lokasi Saya",
    locating: "Mengesan lokasi...",
    permissionDenied: "Akses lokasi ditolak. Sila pilih bandar di bawah.",
    nearestCity: "Menunjukkan bandar terdekat:",

    // Weather card
    goodConditions: "Keadaan baik untuk menunggang!",
    rideCaution: "Tunggang berhati-hati - awas jalan licin",
    avoidRiding: "Elak menunggang - keadaan berbahaya",
    updated: "Dikemas kini:",
    cached: "(tersimpan)",

    // Weather stats
    temp: "Suhu",
    rain: "Hujan",
    wind: "Angin",
    humidity: "Kelembapan",
    visibility: "Penglihatan",
    rainType: "Jenis Hujan",

    // Forecast
    bestTimeToRide: "Masa Terbaik Menunggang",
    noGoodWindow: "Tiada tetingkap ideal dalam 24 jam",
    recommendedWindow: "Masa yang disyorkan:",
    safestHour: "Jam paling selamat:",
    forecastTimeline: "Ramalan 24 Jam",
    loading: "Memuatkan...",
    loadingForecast: "Memuatkan ramalan...",

    // Route check
    routeCheck: "Semak Laluan",
    from: "Dari",
    to: "Ke",
    selectStart: "Pilih lokasi permulaan",
    selectDest: "Pilih destinasi",
    searchLocation: "Cari lokasi...",
    checkRouteSafety: "Semak Keselamatan Laluan",
    checkingRoute: "Menyemak laluan...",
    pickStartOnMap: "Letak mula di peta",
    pickEndOnMap: "Letak destinasi di peta",
    routeStartUnset: "Titik mula laluan belum dipilih",
    routeEndUnset: "Titik akhir laluan belum dipilih",
    tapMapToPlaceStart: "Tekan peta untuk meletakkan pin mula laluan.",
    tapMapToPlaceEnd: "Tekan peta untuk meletakkan pin akhir laluan.",
    clearRoute: "Kosongkan laluan",
    dragPinsHint: "Gunakan pin A dan B pada peta untuk laras laluan anda.",
    routeRisk: "Risiko Laluan",
    routeWeatherHeadline: "Cuaca Sepanjang Laluan Ini",
    routeWeatherSubhead: "Hujan, suhu, angin, dan bahagian paling teruk dipaparkan dahulu.",
    routeSummary: "Ringkasan Laluan",
    maxRain: "Hujan Maks",
    tempRange: "Julat Suhu",
    windRange: "Julat Angin",
    worstStretch: "Bahagian Terburuk",
    score: "Skor",
    savedRoutes: "Laluan Tersimpan",
    saveRoute: "Simpan laluan ini",
    routeAlreadySaved: "Laluan sudah disimpan",
    swapLocations: "Tukar lokasi",

    // Monsoon
    monsoonHigh: "Risiko Monsun Tinggi",
    monsoonModerate: "Musim Monsun",
    monsoonCaution: "Peralihan Monsun",
    dismiss: "Tutup",

    // Sharing
    shareWeather: "Kongsi",
    shareTitle: "RideSafe MY — Keselamatan Cuaca",
    shareViaWhatsApp: "Kongsi via WhatsApp",
    shareViaTelegram: "Kongsi via Telegram",
    shareCard: "Kad Kongsi",
    copied: "Disalin!",

    // Offline / PWA
    offlineBanner: "Anda luar talian. Menunjukkan data tersimpan.",
    installApp: "Pasang Apl",
    installPrompt: "Tambah RideSafe MY ke skrin utama anda",
    install: "Pasang",
    notNow: "Tidak sekarang",

    // Address search
    searchAddress: "Cari bandar atau alamat...",
    noResults: "Tiada keputusan",
    searching: "Mencari...",

    // Errors
    tryAgain: "Sila cuba sebentar lagi",
    failedWeather: "Gagal mendapatkan cuaca",
    failedRoute: "Gagal menyemak laluan",

    // Safety levels
    safe: "Selamat",
    caution: "Berhati-hati",
    dangerous: "Berbahaya",

    // Auth
    signIn: "Log Masuk",
    signUp: "Daftar",
    signOut: "Log Keluar",
    email: "E-mel",
    password: "Kata Laluan",
    displayName: "Nama Paparan",
    continueWithGoogle: "Teruskan dengan Google",
    signingIn: "Log masuk...",
    signingUp: "Mendaftar...",
    authError: "Pengesahan gagal. Sila cuba lagi.",
    syncCTA: "Log masuk untuk segerak merentas peranti",
    profile: "Profil",
    rideHistory: "Sejarah Tunggangan",

    // Incidents
    reportIncident: "Laporkan Bahaya",
    incidentType: "Jenis Bahaya",
    incidentDescription: "Keterangan (pilihan)",
    incidentDescPlaceholder: "Butiran ringkas tentang bahaya ini...",
    submitIncident: "Hantar Laporan",
    submitting: "Menghantar...",
    incidentFlood: "Banjir",
    incidentAccident: "Kemalangan",
    incidentRoadDamage: "Kerosakan Jalan",
    incidentFallenTree: "Pokok Tumbang",
    incidentOilSpill: "Tumpahan Minyak",
    incidentPoliceRoadblock: "Sekatan Polis",
    incidentTrafficJam: "Kesesakan Lalu Lintas",
    incidentOther: "Lain-lain",
    tapMapToReport: "Tekan lama peta untuk membuat laporan",
    upvote: "Sahkan",
    incidentsNearby: "bahaya di laluan ini",
    showIncidents: "Bahaya",
    hideIncidents: "Bahaya",
    noIncidents: "Tiada bahaya aktif dilaporkan",

    // AI Advisor
    aiAdvisor: "Penasihat AI Menunggang",
    aiAdvisorBeta: "Beta",
    aiAdvisorPlaceholder: "Tanya tentang keadaan menunggang...",
    aiAdvisorSend: "Tanya",
    aiAdvisorRateLimit: "Had harian dicapai. Kembali esok.",
    aiAdvisorQueriesLeft: "soalan tinggal hari ini",
    aiAdvisorDisclaimer: "Nasihat AI adalah tambahan — sentiasa gunakan pertimbangan sendiri.",
    suggestedQ1: "Adakah selamat menunggang sekarang?",
    suggestedQ2: "Masa terbaik untuk menunggang hari ini?",
    suggestedQ3: "Apakah punca skor rendah ini?",
    suggestedQ4: "Ada bahaya di laluan saya?",

    // Ride Log
    logThisRide: "Log Tunggangan Ini",
    rideLoggedSuccess: "Tunggangan dilog!",
    noRideLogs: "Tiada tunggangan dilog lagi",
    rideLogCTA: "Log masuk untuk simpan buku log tunggangan",
    totalRides: "Jumlah Tunggangan",
    avgSafetyScore: "Purata Keselamatan",
    mostFrequentRoute: "Laluan Utama",
    addNotes: "Tambah nota (pilihan)",
    notes: "Nota",

    // Notifications
    notifications: "Pemberitahuan",
    noNotifications: "Tiada pemberitahuan lagi",
    markAllRead: "Tandakan semua dibaca",
    unread: "belum dibaca",
    enablePushAlerts: "Aktifkan Amaran",
    pushAlertsEnabled: "Amaran Aktif",
    pushAlertsUnsupported: "Amaran tolak tidak disokong pelayar ini",
    routeAlertTitle: "Amaran Keselamatan Laluan",

    // Navigation handoff
    openInWaze: "Buka dalam Waze",
    openInGoogleMaps: "Buka dalam Maps",

    // Heatmap
    showHeatmap: "Peta Haba",
    hideHeatmap: "Peta Haba",
    quickCityShortcuts: "Pintasan bandar segera",
    heatmapGuide: "Panduan peta haba",
    safer: "Lebih selamat",
    riskier: "Lebih berisiko",
    mapPrimaryHint: "Cari lokasi atau tekan penanda untuk melihat cuaca semasa.",
    routePlacementHint: "Tekan Dari atau Ke di bawah, kemudian pilih titik pada peta.",
    routePlacementScrollHint: "Peta akan tatal ke atas secara automatik supaya anda boleh meletakkan pin.",
    searchStartRoute: "Taip atau cari titik mula anda",
    searchEndRoute: "Taip atau cari destinasi anda",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
