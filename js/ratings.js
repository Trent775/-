// ============================================================================
// МОДУЛЬ: КОММЕРЧЕСКИЕ РИСКИ И ЗВЕЗДНЫЕ РЕЙТИНГИ
// Версия 4.1: Чистая русскоязычная терминология B2B-снабжения
// ============================================================================

const RatingsModule = {
    currentMuffId: '3stp10',
    manufacturers: ["ЭРГ", "ТРАНСЭНЕРГО", "РИКА", "НИЛЕД", "КВТ"], 
    weights: { 'R': 0.70, 'F': 0.20, 'C': 0.10 },
    
    init() {
        this.renderRatingsTab();
    },

    getMuffData() {
        return window.MuffsRegistry[this.currentMuffId];
    },

    calculateScores() {
        const data = this.getMuffData();
        if (!data) return [];
        
        let results = {};

        this.manufacturers.forEach(mfr => {
            let sums = { 'R': 0, 'F': 0, 'C': 0 };
            let maxSums = { 'R': 0, 'F': 0, 'C': 0 };
            let penalties = { 'R': 0, 'F': 0, 'C': 0 }; 

            data.components.forEach(comp => {
                const proj = comp.projection;
                const crit = comp.criticality || 1.0;
                const mfrData = comp.manufacturers[mfr];

                if (mfrData && proj in sums) {
                    sums[proj] += mfrData.score * crit;
                    maxSums[proj] += 1.0 * crit;

                    if (crit >= 0.90 && mfrData.score <= 0.5) penalties[proj] += 0.20; 
                    else if (crit >= 0.80 && mfrData.score <= 0.5) penalties[proj] += 0.10;
                }
            });

            let baseR = maxSums['R'] > 0 ? (sums['R'] / maxSums['R']) : 0;
            let baseF = maxSums['F'] > 0 ? (sums['F'] / maxSums['F']) : 0;
            let baseC = maxSums['C'] > 0 ? (sums['C'] / maxSums['C']) : 0;

            const scoreR = Math.max(0, baseR - penalties['R']);
            const scoreF = Math.max(0, baseF - penalties['F']);
            const scoreC = Math.max(0, baseC - penalties['C']);

            const totalScore = (scoreR * this.weights['R']) + 
                               (scoreF * this.weights['F']) + 
                               (scoreC * this.weights['C']);

            const verdicts = data.manufacturer_verdicts ? data.manufacturer_verdicts[mfr] : null;

            results[mfr] = {
                total: totalScore,
                stars: (totalScore * 5).toFixed(1),
                details: { R: scoreR, F: scoreF, C: scoreC },
                verdicts: verdicts
            };
        });

        return Object.entries(results).sort((a, b) => b[1].total - a[1].total);
    },

    renderStars(ratingOut5) {
        let starsHtml = '';
        const fullStars = Math.floor(ratingOut5);
        const hasHalf = (ratingOut5 - fullStars) >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

        for(let i=0; i<fullStars; i++) starsHtml += `<span style="color:#ffd700; font-size:1.4rem;">★</span>`;
        if(hasHalf) starsHtml += `<span style="color:#ffd700; font-size:1.4rem;">⯨</span>`;
        for(let i=0; i<emptyStars; i++) starsHtml += `<span style="color:#555; font-size:1.4rem;">☆</span>`;
        
        return `<div style="display:flex; align-items:center; gap:5px;">${starsHtml} <span style="color:#fff; font-size:1rem; font-weight:bold; margin-left:10px; background: rgba(255,255,255,0.1); padding: 3px 10px; border-radius: 15px;">${ratingOut5} / 5.0</span></div>`;
    },

    renderCapexIcons(level, color) {
        let html = '';
        for(let i = 1; i <= 5; i++) {
            if(i <= level) {
                html += `<span style="color: ${color};">₽</span>`;
            } else {
                html += `<span style="color: #334055;">₽</span>`;
            }
        }
        return html;
    },

    renderJustification(verdicts) {
        let html = '<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">';
        
        if (verdicts.strengths && verdicts.strengths.length > 0) {
            html += `<div style="font-size: 0.75rem; color: #00cc66; font-weight: bold; text-transform: uppercase;">Обеспеченный запас прочности:</div>`;
            html += `<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px;">`;
            verdicts.strengths.forEach(item => {
                html += `<li style="font-size: 0.85rem; color: #ddd; line-height: 1.4; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: #00cc66;">✓</span>${item}</li>`;
            });
            html += `</ul>`;
        }

        if (verdicts.weaknesses && verdicts.weaknesses.length > 0) {
            // КРИТИЧЕСКАЯ ПРАВКА: Убрали OPEX
            html += `<div style="font-size: 0.75rem; color: #ffaa00; font-weight: bold; text-transform: uppercase; margin-top: 10px;">Скрытые эксплуатационные риски:</div>`;
            html += `<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px;">`;
            verdicts.weaknesses.forEach(item => {
                html += `<li style="font-size: 0.85rem; color: #ddd; line-height: 1.4; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: #ffaa00;">!</span>${item}</li>`;
            });
            html += `</ul>`;
        }

        html += '</div>';
        return html;
    },

    renderRatingsTab() {
        const container = document.getElementById('tab-ratings');
        if (!container) return;

        const scores = this.calculateScores();
        if (scores.length === 0) return;

        let html = `
            <div class="analysis-header" style="margin-bottom: 20px; text-align: center;">
                <h2 class="panel-title" style="color: #fff; font-size: 1.5rem; border: none; margin-bottom: 5px;">КОММЕРЧЕСКИЕ РИСКИ (СТОИМОСТЬ ВЛАДЕНИЯ)</h2>
                <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 900px; margin: 0 auto;">Сводный функционально-стоимостной анализ. Сопоставление уровня начальных затрат на закупку с инженерной надежностью, защищающей от скрытых убытков на ремонт и обслуживание.</p>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:15px; max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
        `;

        scores.forEach(([mfr, data], index) => {
            const isLeader = index === 0;
            const bg = isLeader ? 'linear-gradient(135deg, rgba(255,107,0,0.1) 0%, rgba(21,26,34,0.9) 100%)' : 'rgba(21, 26, 34, 0.8)';
            const border = isLeader ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)';
            
            const commercial = data.verdicts.commercial || { capex_level: 3, capex_color: '#888', tco_text: 'Нет данных' };

            html += `
                <div style="background: ${bg}; border: ${border}; border-radius: 12px; padding: 20px; display: flex; gap: 25px; align-items: stretch; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    
                    <div style="flex: 1; border-right: 1px solid rgba(255,255,255,0.05); padding-right: 20px; min-width: 250px;">
                        <div style="font-size: 1.5rem; font-weight: 800; color: #fff; margin-bottom: 10px;">${index + 1}. ${mfr}</div>
                        <div style="margin-bottom: 15px;">${this.renderStars(data.stars)}</div>
                        
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-muted); margin-bottom:3px; text-transform: uppercase;">
                                    <span>Работоспособность (70%)</span> <span style="color:#ff6666;">${(data.details.R * 100).toFixed(0)}%</span>
                                </div>
                                <div style="width:100%; height:4px; background:rgba(0,0,0,0.5); border-radius:2px;">
                                    <div style="width:${Math.max(0, data.details.R) * 100}%; height:100%; background:#ff6666;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-muted); margin-bottom:3px; text-transform: uppercase;">
                                    <span>Монтаж (20%)</span> <span style="color:#ffaa00;">${(data.details.F * 100).toFixed(0)}%</span>
                                </div>
                                <div style="width:100%; height:4px; background:rgba(0,0,0,0.5); border-radius:2px;">
                                    <div style="width:${Math.max(0, data.details.F) * 100}%; height:100%; background:#ffaa00;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-muted); margin-bottom:3px; text-transform: uppercase;">
                                    <span>Эргономика (10%)</span> <span style="color:#00ccff;">${(data.details.C * 100).toFixed(0)}%</span>
                                </div>
                                <div style="width:100%; height:4px; background:rgba(0,0,0,0.5); border-radius:2px;">
                                    <div style="width:${Math.max(0, data.details.C) * 100}%; height:100%; background:#00ccff;"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="flex: 1; border-right: 1px solid rgba(255,255,255,0.05); padding-right: 20px; min-width: 250px;">
                        <div style="font-size: 0.9rem; color: #fff; font-weight: bold; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 15px;">УРОВЕНЬ ЗАКУПОЧНОЙ ЦЕНЫ:</div>
                        
                        <div style="display:flex; align-items:center; gap: 8px; margin-bottom: 15px;">
                            <div style="font-size: 1.6rem; letter-spacing: 4px; font-weight: bold; background: rgba(0,0,0,0.3); padding: 5px 15px; border-radius: 8px;">
                                ${this.renderCapexIcons(commercial.capex_level, commercial.capex_color)}
                            </div>
                        </div>
                        
                        <div style="font-size: 0.85rem; color: #ddd; line-height: 1.5; text-align: justify;">
                            ${commercial.tco_text}
                        </div>
                    </div>

                    <div style="flex: 1.5; display: flex; flex-direction: column; min-width: 300px;">
                        <div style="font-size: 0.9rem; color: #fff; font-weight: bold; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 8px;">Инженерное резюме:</div>
                        ${this.renderJustification(data.verdicts)}
                    </div>

                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { RatingsModule.init(); }, 150);
});