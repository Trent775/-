// ============================================================================
// МОДУЛЬ: ДЕТАЛЬНЫЙ АНАЛИЗ (КОММЕРЧЕСКОЕ СРАВНЕНИЕ)
// С поддержкой фактических параметров и интерактивных Архитектурных Инсайтов
// ============================================================================

const AnalysisModule = {
    currentMuffId: '3stp10',
    
    init() {
        if (!window.MuffsRegistry || !window.MuffsRegistry[this.currentMuffId]) return;
        this.renderAnalysisTab();
    },

    getMuffData() {
        return window.MuffsRegistry[this.currentMuffId];
    },

    renderAnalysisTab() {
        const data = this.getMuffData();
        const container = document.getElementById('tab-analysis');
        if (!container || !data) return;

        let html = `
            <div class="analysis-header">
                <h2 class="panel-title" style="color: #fff; font-size: 1.5rem; border: none; margin-bottom: 5px;">ДЕТАЛЬНЫЙ B2B-АНАЛИЗ КОМПЛЕКТАЦИЙ</h2>
                <p style="color: var(--text-muted); font-size: 1rem;">Сравнение фактических характеристик с нормативной базой. Оценка технических компромиссов.</p>
            </div>
            <div class="accordions-wrapper">
        `;

        data.groups.forEach((groupName, index) => {
            const groupComponents = data.components.filter(c => c.group === groupName);
            if (groupComponents.length === 0) return;

            const isOpenClass = index === 0 ? 'open' : '';

            html += `
            <div class="accordion-item ${isOpenClass}">
                <button class="accordion-btn" onclick="this.parentElement.classList.toggle('open')">
                    <span>${groupName}</span>
                    <span class="comp-count">${groupComponents.length} компонентов</span>
                </button>
                <div class="accordion-body">
                    <div class="table-container">
                        <table class="analysis-table">
                            <thead>
                                <tr>
                                    <th style="width: 20%;">Инженерный узел / ЭТАЛОН</th>
                                    <th style="width: 16%;">ЭРГ</th>
                                    <th style="width: 16%;">НИЛЕД</th>
                                    <th style="width: 16%;">КВТ</th>
                                    <th style="width: 16%;">РИКА</th>
                                    <th style="width: 16%;">ТРАНСЭНЕРГО</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${groupComponents.map(comp => this.renderTableRow(comp)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    },

    renderTableRow(comp) {
        const manufacturersList = ["ЭРГ", "НИЛЕД", "КВТ", "РИКА", "ТРАНСЭНЕРГО"];
        
        const projectionNames = { 'R': 'Работоспособность', 'F': 'Устойчивость монтажа', 'C': 'Культура производства' };
        const projName = projectionNames[comp.projection] || comp.projection;

        // Блок НОРМЫ (Эталон)
        let normsHtml = '<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">';
        normsHtml += '<div style="font-size: 0.7rem; color: #ffd700; font-weight: bold; margin-bottom: 5px;">НОРМА (ЭТАЛОН):</div>';
        if (comp.norms) {
            for (let nKey in comp.norms) {
                let cleanNKey = nKey.replace(/_/g, ' ').replace(/(^\w)/, c => c.toUpperCase());
                normsHtml += `<div style="font-size: 0.8rem; color: #ddd; margin-bottom: 3px;">• ${cleanNKey}: <b>${comp.norms[nKey].значение} ${comp.norms[nKey].единица}</b></div>`;
            }
        } else {
            normsHtml += `<div style="font-size: 0.8rem; color: #888;">Норматив не задан</div>`;
        }
        normsHtml += '</div>';

        let rowHtml = `
            <tr>
                <td class="comp-info-cell">
                    <div class="comp-name">${comp.name}</div>
                    <div class="comp-badge projection-${comp.projection}">${projName}</div>
                    ${normsHtml}
                </td>
        `;

        // Генерация ячеек производителей (с фактами и оценками)
        manufacturersList.forEach(mfr => {
            const mData = comp.manufacturers[mfr];
            if (!mData) {
                rowHtml += `<td class="mfr-cell"><div style="color: #666; text-align: center;">Нет данных</div></td>`;
                return;
            }

            let colorClass = 'score-low';
            let statusTag = '<span class="status-tag status-low">ЗОНА РИСКА</span>';
            
            if (mData.score >= 0.9) {
                colorClass = 'score-high';
                statusTag = '<span class="status-tag status-high">ОПТИМАЛЬНО</span>';
            } else if (mData.score >= 0.75) {
                colorClass = 'score-mid';
                statusTag = '<span class="status-tag status-mid">КОМПРОМИСС</span>';
            }

            let factsHtml = '';
            for (let key in mData) {
                if (key !== 'комментарий' && key !== 'score') {
                    let cleanKey = key.replace(/_/g, ' ');
                    factsHtml += `<div class="fact-item"><b>${cleanKey}:</b> ${mData[key]}</div>`;
                }
            }

            rowHtml += `
                <td class="mfr-cell ${colorClass}">
                    ${statusTag}
                    <div class="cell-facts">${factsHtml}</div>
                    <div class="cell-comment">${mData.комментарий}</div>
                </td>
            `;
        });
        rowHtml += `</tr>`;

        // ВНЕДРЕНИЕ АРХИТЕКТУРНОГО ИНСАЙТА (Кликабельный аккордеон)
        if (comp.insight) {
            rowHtml += `
                <tr class="insight-row">
                    <td colspan="6">
                        <button class="insight-btn" onclick="this.parentElement.parentElement.classList.toggle('open')">
                            <span class="arrow">▼</span> ${comp.insight.title}
                        </button>
                        <div class="insight-body">
                            ${comp.insight.text}
                        </div>
                    </td>
                </tr>
            `;
        }

        return rowHtml;
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Небольшая задержка, чтобы база данных точно успела загрузиться в window
    setTimeout(() => { AnalysisModule.init(); }, 100);
});