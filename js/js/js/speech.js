/* ===================================================
   VOICE ASSISTANT (WEB SPEECH API)
   =================================================== */

const VoiceAssistant = {
    speak: function(text) {
        if (!('speechSynthesis' in window)) return;
        
        window.speechSynthesis.cancel(); // Hủy giọng cũ
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.8; // Đọc chậm cho học sinh lớp 1
        
        // Chọn giọng vi-VN nếu có
        const voices = window.speechSynthesis.getVoices();
        const viVoice = voices.find(v => v.lang.includes('vi'));
        if (viVoice) utterance.voice = viVoice;
        
        window.speechSynthesis.speak(utterance);
    }
};
