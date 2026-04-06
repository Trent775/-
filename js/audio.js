// ============================================================================
// AUDIO ENGINE (Core Module) - ВЕРСИЯ 2.0 (ФИКС ОЧЕРЕДИ)
// Жесткий контроль состояния аудио. Исправлен баг самоуничтожения очереди.
// ============================================================================

const AudioEngine = {
    playedHistory: new Set(), 
    currentAudio: null,       
    sequenceQueue: [],        
    isMuted: false,

    playSequence(trackIds) {
        if (this.isMuted) return;
        // Фильтруем треки, которые уже играли в этой сессии
        this.sequenceQueue = trackIds.filter(id => !this.playedHistory.has(id));
        if (this.sequenceQueue.length === 0) return;
        this._playNextInSequence();
    },

    _playNextInSequence() {
        if (this.sequenceQueue.length === 0) return;
        const trackId = this.sequenceQueue.shift(); 
        this._executePlay(trackId, () => {
            this._playNextInSequence(); // Рекурсивный вызов следующего трека
        });
    },

    playOnce(trackId) {
        if (this.isMuted) return;
        if (this.playedHistory.has(trackId)) return;
        
        // Если пользователь кликнул сам (на точку или вкладку), жестко убиваем текущую очередь
        this.sequenceQueue = []; 
        this._executePlay(trackId);
    },

    _executePlay(trackId, onEndedCallback = null) {
        // КРИТИЧЕСКИЙ ФИКС: Останавливаем текущий звук, но НЕ стираем очередь!
        this.stop(false); 
        
        try {
            this.currentAudio = new Audio(`audio/${trackId}.mp3`);
            this.playedHistory.add(trackId);

            this.currentAudio.onended = () => {
                this.currentAudio = null;
                if (onEndedCallback) onEndedCallback();
            };

            this.currentAudio.play()
                .then(() => {
                    console.log(`🔊 Воспроизведение успешно: ${trackId}.mp3`);
                })
                .catch(e => {
                    console.error(`🔇 Ошибка аудио ${trackId}. Файл не найден или заблокирован браузером.`, e);
                    // Даже если произошла ошибка (файла нет), идем дальше по очереди, чтобы не застопорить систему
                    if (onEndedCallback) onEndedCallback();
                });

        } catch (error) {
            console.error("Критическая ошибка аудио движка:", error);
        }
    },

    // Добавлен флаг clearQueue. По умолчанию он true (для жесткой остановки при смене вкладок)
    stop(clearQueue = true) {
        if (clearQueue) {
            this.sequenceQueue = []; 
        }
        
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio.onended = null;
            this.currentAudio = null;
            console.log("⏹️ Аудио остановлено");
        }
    }
};

// ВАЖНО: Делаем движок доступным глобально для всех файлов!
window.AudioEngine = AudioEngine;