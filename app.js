// Core JavaScript for 2026 Mao Gai Quiz and Memorizing App

document.addEventListener("DOMContentLoaded", () => {
    // App State
    let database = null;
    let currentTab = "dashboard";
    
    // User progress stats (saved in LocalStorage)
    let userProgress = {
        // maps questionId -> { answered: true, correct: boolean, selected: [A, B, C, D] }
        answered: {}, 
        // Array of questionIds
        wrongQuestions: [], 
        // Array of subjective questionIds
        masteredFlashcards: []
    };

    // Practice mode state
    let practiceState = {
        chapterId: "",
        questions: [],
        currentIndex: 0,
        selectedOptions: [] // for multiple choice
    };

    // Exam mode state
    let examState = {
        questions: [],
        currentIndex: 0,
        selectedAnswers: {}, // questionId -> selected options array
        timerInterval: null,
        timeRemaining: 0,
        totalTime: 0,
        isSubmitted: false
    };

    // Wrong collection mode state
    let wrongState = {
        questions: [],
        currentIndex: 0,
        selectedOptions: []
    };

    // Flashcard mode state
    let flashcardState = {
        chapterId: "",
        questions: [],
        currentIndex: 0,
        isFlipped: false
    };

    // Load LocalStorage progress
    function loadProgress() {
        const stored = localStorage.getItem("maogai_user_progress");
        if (stored) {
            try {
                const parsed = jsonParse(stored);
                if (parsed) {
                    userProgress = Object.assign(userProgress, parsed);
                }
            } catch (e) {
                console.error("Error parsing progress", e);
            }
        }
        updateWrongBadge();
    }

    // Helper for safe JSON parsing
    function jsonParse(str) {
        try {
            return JSON.parse(str);
        } catch(e) {
            return null;
        }
    }

    // Save progress to LocalStorage
    function saveProgress() {
        localStorage.setItem("maogai_progress", JSON.stringify(userProgress));
        
        // --- Added for Leaderboard ---
        // Calculate correct practice questions
        let correctCount = 0;
        Object.keys(userProgress.answered).forEach(qid => {
            if (userProgress.answered[qid].correct) correctCount++;
        });
        if (typeof currentUser !== 'undefined' && currentUser && typeof lastPracticeScore !== 'undefined' && correctCount > lastPracticeScore) {
            lastPracticeScore = correctCount;
            submitScore('practice', 1); // server increments practice score by the passed value
        }
        updateWrongBadge();
    }

    // Update wrong questions count in header navigation badge
    function updateWrongBadge() {
        const badge = document.getElementById("wrong-count-badge");
        if (badge) {
            const count = userProgress.wrongQuestions.length;
            badge.textContent = count;
            badge.style.display = count > 0 ? "inline-block" : "none";
        }
    }

    // Initialize Lucide Icons
    function initIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // Tab Switching Logic
    const navButtons = document.querySelectorAll(".nav-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            switchTab(tabId);
        });
    });

    function switchTab(tabId) {
        currentTab = tabId;
        
        // Update Nav buttons UI
        navButtons.forEach(btn => {
            if (btn.getAttribute("data-tab") === tabId) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Update Tab visibility
        tabContents.forEach(tab => {
            if (tab.id === `tab-${tabId}`) {
                tab.classList.add("active");
            } else {
                tab.classList.remove("active");
            }
        });

        // Clean up intervals or custom states if switching away from active modules
        if (tabId !== "exam") {
            clearInterval(examState.timerInterval);
        }

        // Initialize view specific loaders
        if (tabId === "dashboard") {
            renderDashboard();
        } else if (tabId === "wrong-collection") {
            initWrongCollection();
        } else if (tabId === "practice") {
            // If no chapter selected yet, show dashboard chapter list
            if (!practiceState.chapterId) {
                switchTab("dashboard");
            } else {
                renderPracticeView();
            }
        } else if (tabId === "flashcard") {
            initFlashcardSetup();
        }
    }

    // Load Database
    async function loadDatabase() {
        try {
            const response = await fetch("questions.json");
            database = await response.json();
            loadProgress();
            renderDashboard();
            initExamChapterCheckboxes();
            initFlashcardSetup();
            updateRecommendation();
        } catch (error) {
            console.error("Failed to load questions.json", error);
            document.getElementById("chapters-list").innerHTML = `
                <div class="glass text-center" style="grid-column: 1/-1; padding: 2rem;">
                    <i data-lucide="alert-triangle" style="color: var(--incorrect); width: 48px; height: 48px;"></i>
                    <h2>数据加载失败</h2>
                    <p>未能成功加载题库数据 (questions.json)。请检查路径或运行 Python 提取脚本后再试。</p>
                </div>
            `;
            initIcons();
        }
    }

    // Recommendation logic on dashboard
    function updateRecommendation() {
        const textElement = document.getElementById("recommendation-text");
        if (!textElement) return;

        if (userProgress.wrongQuestions.length > 0) {
            textElement.innerHTML = `你目前有 <strong style="color: var(--incorrect);">${userProgress.wrongQuestions.length}</strong> 道错题，建议立刻前往“<strong>错题本</strong>”进行巩固复习，强化记忆！`;
        } else {
            // Find chapter with lowest progress
            let lowestProgress = 100;
            let recommendedCh = "";
            let recommendedChName = "";
            
            Object.keys(database).forEach(chId => {
                const total = getChapterQuestionsCount(chId, ["single", "multiple"]);
                if (total === 0) return;
                const answered = getChapterAnsweredCount(chId);
                const progress = Math.round((answered / total) * 100);
                if (progress < lowestProgress) {
                    lowestProgress = progress;
                    recommendedCh = chId;
                    recommendedChName = database[chId].name;
                }
            });

            if (recommendedCh) {
                if (lowestProgress === 0) {
                    textElement.innerHTML = `你还没有开始学习 <strong>${recommendedChName}</strong>，建议从这一章开始练习！`;
                } else if (lowestProgress < 100) {
                    textElement.innerHTML = `你在 <strong>${recommendedChName}</strong> 的进度是 <strong>${lowestProgress}%</strong>，快来将它刷满通关吧！`;
                } else {
                    textElement.innerHTML = `太棒了！所有章节你均已通关，建议开启一场“<strong>模拟考试</strong>”来测试备考水平！`;
                }
            } else {
                textElement.innerHTML = `欢迎来到备考系统！推荐你进入章节练习进行第一轮刷题。`;
            }
        }
        initIcons();
    }

    // Bind Quick Start recommendation button
    document.getElementById("btn-quick-start").addEventListener("click", () => {
        if (userProgress.wrongQuestions.length > 0) {
            switchTab("wrong-collection");
        } else {
            // Find lowest progress chapter
            let lowestProgress = 100;
            let recommendedCh = "intro";
            
            Object.keys(database).forEach(chId => {
                const total = getChapterQuestionsCount(chId, ["single", "multiple"]);
                if (total === 0) return;
                const answered = getChapterAnsweredCount(chId);
                const progress = Math.round((answered / total) * 100);
                if (progress < lowestProgress) {
                    lowestProgress = progress;
                    recommendedCh = chId;
                }
            });
            
            startPractice(recommendedCh);
        }
    });

    // Helper functions for stats
    function getChapterQuestionsCount(chId, types = ["single", "multiple", "short", "essay"]) {
        if (!database || !database[chId]) return 0;
        return database[chId].questions.filter(q => types.includes(q.type)).length;
    }

    function getChapterAnsweredCount(chId) {
        if (!database || !database[chId]) return 0;
        let count = 0;
        database[chId].questions.forEach(q => {
            if (userProgress.answered[q.id]) count++;
        });
        return count;
    }

    // Render Dashboard Chapters List
    function renderDashboard() {
        const chaptersList = document.getElementById("chapters-list");
        if (!chaptersList || !database) return;
        
        chaptersList.innerHTML = "";

        // Calculate and Render overall statistics
        let totalQ = 0;
        let answeredQ = 0;
        let correctQ = 0;
        
        Object.keys(database).forEach(chId => {
            database[chId].questions.forEach(q => {
                if (q.type === "single" || q.type === "multiple") {
                    totalQ++;
                    if (userProgress.answered[q.id]) {
                        answeredQ++;
                        if (userProgress.answered[q.id].correct) {
                            correctQ++;
                        }
                    }
                }
            });
        });

        // Set text
        document.getElementById("total-answered").textContent = answeredQ;
        document.getElementById("wrong-total").textContent = userProgress.wrongQuestions.length;
        document.getElementById("flashcard-mastered").textContent = userProgress.masteredFlashcards.length;
        
        const accuracy = answeredQ > 0 ? Math.round((correctQ / answeredQ) * 100) : 0;
        document.getElementById("total-accuracy").textContent = `${accuracy}%`;
        
        const overallProgress = totalQ > 0 ? Math.round((answeredQ / totalQ) * 100) : 0;
        document.getElementById("overall-progress-text").textContent = `${overallProgress}%`;
        document.getElementById("overall-progress-fill").style.width = `${overallProgress}%`;

        // Render each chapter card
        Object.keys(database).forEach(chId => {
            const chName = database[chId].name;
            const singleCount = getChapterQuestionsCount(chId, ["single"]);
            const multipleCount = getChapterQuestionsCount(chId, ["multiple"]);
            const subjectiveCount = getChapterQuestionsCount(chId, ["short", "essay"]);
            
            const totalChoices = singleCount + multipleCount;
            const answeredChoices = getChapterAnsweredCount(chId);
            const progressPercent = totalChoices > 0 ? Math.round((answeredChoices / totalChoices) * 100) : 0;
            
            const card = document.createElement("div");
            card.className = "chapter-card glass";
            card.innerHTML = `
                <div class="chapter-info">
                    <h4>${chName}</h4>
                    <span>共 ${totalChoices} 道客观题 / ${subjectiveCount} 道简答论述</span>
                </div>
                <div class="chapter-progress">
                    <div class="chapter-progress-text">
                        <span>复习进度</span>
                        <span>${progressPercent}% (${answeredChoices}/${totalChoices})</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
            `;
            
            card.addEventListener("click", () => {
                startPractice(chId);
            });
            
            chaptersList.appendChild(card);
        });

        initIcons();
    }

    // Start Chapter Practice
    function startPractice(chId) {
        practiceState.chapterId = chId;
        // Filter out short and essay questions for standard practice
        practiceState.questions = database[chId].questions.filter(q => q.type === "single" || q.type === "multiple");
        practiceState.currentIndex = 0;
        practiceState.selectedOptions = [];
        
        switchTab("practice");
    }

    // Render Practice Question area
    function renderPracticeView() {
        const titleEl = document.getElementById("practice-chapter-title");
        const progressNumEl = document.getElementById("practice-progress-num");
        const progressBarFill = document.getElementById("practice-progress-fill");
        
        titleEl.textContent = database[practiceState.chapterId].name;
        
        // Filter by question type if required
        const filterVal = document.getElementById("practice-type-filter").value;
        let filteredQuestions = practiceState.questions;
        if (filterVal !== "all") {
            filteredQuestions = practiceState.questions.filter(q => q.type === filterVal);
        }

        if (filteredQuestions.length === 0) {
            document.getElementById("practice-stem").textContent = "当前没有匹配筛选条件的题目。";
            document.getElementById("practice-options").innerHTML = "";
            progressNumEl.textContent = "0/0";
            progressBarFill.style.width = "0%";
            document.getElementById("practice-grid").innerHTML = "";
            return;
        }

        // Adjust current index if out of bounds
        if (practiceState.currentIndex >= filteredQuestions.length) {
            practiceState.currentIndex = 0;
        }

        const q = filteredQuestions[practiceState.currentIndex];
        
        // Find index in overall chapter questions for navigator grid
        const overallIndex = practiceState.questions.findIndex(item => item.id === q.id);
        
        // Update stats
        progressNumEl.textContent = `${practiceState.currentIndex + 1} / ${filteredQuestions.length}`;
        const progressPercent = Math.round(((practiceState.currentIndex + 1) / filteredQuestions.length) * 100);
        progressBarFill.style.width = `${progressPercent}%`;

        // Render Navigator Grid
        renderPracticeGrid(filteredQuestions);

        // Render Card header tags
        const typeTag = document.getElementById("practice-question-type");
        typeTag.textContent = q.type === "single" ? "单选题" : "多选题";
        
        // Star fav button status
        const favBtn = document.getElementById("practice-fav-btn");
        if (userProgress.wrongQuestions.includes(q.id)) {
            favBtn.classList.add("active");
            favBtn.title = "从错题本中移除";
        } else {
            btnRemoveActive(favBtn);
            favBtn.title = "加入错题本";
        }

        // Render stem & options
        document.getElementById("practice-stem").textContent = q.stem;
        
        const optionsContainer = document.getElementById("practice-options");
        optionsContainer.innerHTML = "";
        
        // Set list type
        if (q.type === "multiple") {
            optionsContainer.className = "question-options multiple-type";
            document.getElementById("practice-multi-actions").classList.remove("hidden");
        } else {
            optionsContainer.className = "question-options";
            document.getElementById("practice-multi-actions").classList.add("hidden");
        }

        // Check if question was already answered
        const answeredData = userProgress.answered[q.id];
        
        // Reset selections
        practiceState.selectedOptions = answeredData ? [...answeredData.selected] : [];

        q.options.forEach((optText, index) => {
            const letter = optText.charAt(0).toUpperCase();
            const optionDiv = document.createElement("div");
            optionDiv.className = "option-item";
            optionDiv.setAttribute("data-letter", letter);
            
            optionDiv.innerHTML = `
                <div class="opt-marker">${letter}</div>
                <div class="opt-text">${optText.substring(2).trim()}</div>
            `;

            // If already selected/answered
            if (practiceState.selectedOptions.includes(letter)) {
                optionDiv.classList.add("selected");
            }

            // Apply feedback styling if answered
            if (answeredData) {
                const isCorrect = q.answer.includes(letter);
                const isChosen = answeredData.selected.includes(letter);
                
                if (isCorrect) {
                    optionDiv.classList.add("correct");
                } else if (isChosen && !isCorrect) {
                    optionDiv.classList.add("incorrect");
                }
            }

            // Add click listener if not answered
            if (!answeredData) {
                optionDiv.addEventListener("click", () => {
                    handleOptionClick(letter, q.type, optionDiv);
                });
            }

            optionsContainer.appendChild(optionDiv);
        });

        // Show/Hide feedback panel
        const feedbackPanel = document.getElementById("practice-feedback");
        if (answeredData) {
            feedbackPanel.classList.remove("hidden");
            const feedbackText = document.getElementById("feedback-text");
            const correctText = document.getElementById("feedback-correct-answer");
            const explanationBox = document.getElementById("explanation-detail-box");
            const explanationText = document.getElementById("feedback-explanation-text");

            if (answeredData.correct) {
                feedbackText.textContent = "回答正确！";
                feedbackText.className = "feedback-status correct";
                document.querySelector(".icon-correct").classList.remove("hidden");
                document.querySelector(".icon-incorrect").classList.add("hidden");
            } else {
                feedbackText.textContent = "回答错误。";
                feedbackText.className = "feedback-status incorrect";
                document.querySelector(".icon-correct").classList.add("hidden");
                document.querySelector(".icon-incorrect").classList.remove("hidden");
            }

            correctText.textContent = q.answer;
            if (q.explanation) {
                explanationBox.classList.remove("hidden");
                explanationText.textContent = q.explanation;
            } else {
                explanationBox.classList.add("hidden");
            }
        } else {
            feedbackPanel.classList.add("hidden");
        }

        initIcons();
    }

    function btnRemoveActive(btn) {
        if (btn) btn.classList.remove("active");
    }

    // Navigator grid output
    function renderPracticeGrid(questions) {
        const grid = document.getElementById("practice-grid");
        if (!grid) return;
        
        grid.innerHTML = "";
        questions.forEach((q, idx) => {
            const item = document.createElement("span");
            item.className = "grid-item";
            item.textContent = idx + 1;
            
            // Check state
            if (idx === practiceState.currentIndex) {
                item.classList.add("active");
            }
            
            const ans = userProgress.answered[q.id];
            if (ans) {
                if (ans.correct) {
                    item.classList.add("correct");
                } else {
                    item.classList.add("incorrect");
                }
            }

            item.addEventListener("click", () => {
                practiceState.currentIndex = idx;
                renderPracticeView();
            });
            
            grid.appendChild(item);
        });
    }

    // Toggle Favorite / Wrong Question star manually
    document.getElementById("practice-fav-btn").addEventListener("click", () => {
        const filterVal = document.getElementById("practice-type-filter").value;
        let filteredQuestions = practiceState.questions;
        if (filterVal !== "all") {
            filteredQuestions = practiceState.questions.filter(q => q.type === filterVal);
        }
        
        if (filteredQuestions.length === 0) return;
        const q = filteredQuestions[practiceState.currentIndex];
        
        const idx = userProgress.wrongQuestions.indexOf(q.id);
        if (idx > -1) {
            userProgress.wrongQuestions.splice(idx, 1);
            document.getElementById("practice-fav-btn").classList.remove("active");
        } else {
            userProgress.wrongQuestions.push(q.id);
            document.getElementById("practice-fav-btn").classList.add("active");
        }
        saveProgress();
    });

    // Handle Option Clicks
    function handleOptionClick(letter, type, element) {
        if (type === "single") {
            // Immediate check for single choice
            const q = getActiveQuestion("practice");
            const isCorrect = q.answer === letter;
            
            // Save state
            userProgress.answered[q.id] = {
                answered: true,
                correct: isCorrect,
                selected: [letter]
            };

            // If incorrect, add to wrong questions automatically
            if (!isCorrect && !userProgress.wrongQuestions.includes(q.id)) {
                userProgress.wrongQuestions.push(q.id);
            }
            
            saveProgress();

            // Trigger visual shake if wrong
            if (!isCorrect) {
                const card = document.getElementById("practice-question-card");
                card.classList.add("shake");
                setTimeout(() => card.classList.remove("shake"), 350);
            }

            renderPracticeView();
        } else {
            // Multiple choice selection toggle
            if (practiceState.selectedOptions.includes(letter)) {
                practiceState.selectedOptions = practiceState.selectedOptions.filter(x => x !== letter);
                element.classList.remove("selected");
            } else {
                practiceState.selectedOptions.push(letter);
                element.classList.add("selected");
            }
        }
    }

    // Helper to get active question
    function getActiveQuestion(mode) {
        if (mode === "practice") {
            const filterVal = document.getElementById("practice-type-filter").value;
            let filteredQuestions = practiceState.questions;
            if (filterVal !== "all") {
                filteredQuestions = practiceState.questions.filter(q => q.type === filterVal);
            }
            return filteredQuestions[practiceState.currentIndex];
        } else if (mode === "wrong") {
            return wrongState.questions[wrongState.currentIndex];
        }
        return null;
    }

    // Submit Multiple choice answer in practice
    document.getElementById("btn-submit-multiple").addEventListener("click", () => {
        const q = getActiveQuestion("practice");
        if (!q || practiceState.selectedOptions.length === 0) return;

        // Sort options to match standard format e.g. "ABC"
        const sortedSelected = [...practiceState.selectedOptions].sort().join("");
        const standardAns = q.answer.split("").sort().join("");
        
        const isCorrect = sortedSelected === standardAns;

        userProgress.answered[q.id] = {
            answered: true,
            correct: isCorrect,
            selected: [...practiceState.selectedOptions]
        };

        if (!isCorrect && !userProgress.wrongQuestions.includes(q.id)) {
            userProgress.wrongQuestions.push(q.id);
        }

        saveProgress();

        if (!isCorrect) {
            const card = document.getElementById("practice-question-card");
            card.classList.add("shake");
            setTimeout(() => card.classList.remove("shake"), 350);
        }

        renderPracticeView();
    });

    // Navigation buttons in practice
    document.getElementById("btn-practice-prev").addEventListener("click", () => {
        if (practiceState.currentIndex > 0) {
            practiceState.currentIndex--;
            renderPracticeView();
        }
    });

    document.getElementById("btn-practice-next").addEventListener("click", () => {
        const filterVal = document.getElementById("practice-type-filter").value;
        let filteredQuestions = practiceState.questions;
        if (filterVal !== "all") {
            filteredQuestions = practiceState.questions.filter(q => q.type === filterVal);
        }
        
        if (practiceState.currentIndex < filteredQuestions.length - 1) {
            practiceState.currentIndex++;
            renderPracticeView();
        }
    });

    // Filter Change event in practice
    document.getElementById("practice-type-filter").addEventListener("change", () => {
        practiceState.currentIndex = 0;
        renderPracticeView();
    });

    // ==========================================
    // EXAM / MOCK EXAM SECTION
    // ==========================================
    
    function initExamChapterCheckboxes() {
        const container = document.getElementById("exam-chapters-checkboxes");
        if (!container || !database) return;
        
        container.innerHTML = "";
        Object.keys(database).forEach(chId => {
            const chName = database[chId].name;
            const count = getChapterQuestionsCount(chId, ["single", "multiple"]);
            if (count === 0) return;
            
            const div = document.createElement("label");
            div.className = "checkbox-item";
            div.innerHTML = `
                <input type="checkbox" name="exam-chapters" value="${chId}" checked>
                <span>${chName} (${count}题)</span>
            `;
            container.appendChild(div);
        });
    }

    // Start Exam Event
    document.getElementById("btn-start-exam").addEventListener("click", () => {
        const checkedBoxes = document.querySelectorAll("input[name='exam-chapters']:checked");
        if (checkedBoxes.length === 0) {
            alert("请至少选择一个章节进行考试！");
            return;
        }

        // Collect all choice questions from checked chapters
        let pool = [];
        checkedBoxes.forEach(box => {
            const chId = box.value;
            const questions = database[chId].questions.filter(q => q.type === "single" || q.type === "multiple");
            pool = pool.concat(questions);
        });

        if (pool.length === 0) {
            alert("所选章节中没有可用的选择题！");
            return;
        }

        const rawCount = parseInt(document.getElementById("exam-question-count").value);
        const examCount = Math.min(rawCount, pool.length);

        // Shuffle and pick
        const shuffled = shuffleArray(pool);
        examState.questions = shuffled.slice(0, examCount);
        examState.currentIndex = 0;
        examState.selectedAnswers = {};
        examState.isSubmitted = false;

        // Reset timer
        const minutes = parseInt(document.getElementById("exam-duration").value);
        examState.totalTime = minutes * 60;
        examState.timeRemaining = minutes * 60;

        // Switch to active exam view
        document.getElementById("exam-setup").classList.add("hidden");
        document.getElementById("exam-results").classList.add("hidden");
        document.getElementById("exam-active").classList.remove("hidden");

        // Set statistics
        const countElements = document.querySelectorAll(".exam-total-count");
        countElements.forEach(el => el.textContent = examCount);

        renderExamQuestion();
        startExamTimer();
    });

    // Helper to shuffle array
    function shuffleArray(arr) {
        const clone = [...arr];
        for (let i = clone.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [clone[i], clone[j]] = [clone[j], clone[i]];
        }
        return clone;
    }

    // Start countdown timer
    function startExamTimer() {
        const timerEl = document.getElementById("exam-timer");
        const timeProgress = document.getElementById("exam-time-progress");
        
        clearInterval(examState.timerInterval);
        
        updateTimerDisplay();

        examState.timerInterval = setInterval(() => {
            examState.timeRemaining--;
            updateTimerDisplay();
            
            // Progress fill
            const pct = (examState.timeRemaining / examState.totalTime) * 100;
            timeProgress.style.width = `${pct}%`;

            if (examState.timeRemaining <= 0) {
                clearInterval(examState.timerInterval);
                alert("考试时间到，系统已自动提交！");
                submitExam();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const timerEl = document.getElementById("exam-timer");
        const minutes = Math.floor(examState.timeRemaining / 60);
        const seconds = examState.timeRemaining % 60;
        timerEl.textContent = `${padZero(minutes)}:${padZero(seconds)}`;
    }

    function padZero(num) {
        return num < 10 ? `0${num}` : num;
    }

    // Render exam question
    function renderExamQuestion() {
        const q = examState.questions[examState.currentIndex];
        
        // Navigation indexes
        document.getElementById("exam-question-index").textContent = `第 ${examState.currentIndex + 1} / ${examState.questions.length} 题`;
        document.getElementById("exam-question-type").textContent = q.type === "single" ? "单选题" : "多选题";

        // Stem
        document.getElementById("exam-stem").textContent = q.stem;

        // Render option list
        const container = document.getElementById("exam-options");
        container.innerHTML = "";

        if (q.type === "multiple") {
            container.className = "question-options multiple-type";
            if (!examState.isSubmitted) {
                document.getElementById("exam-multi-actions").classList.remove("hidden");
            } else {
                document.getElementById("exam-multi-actions").classList.add("hidden");
            }
        } else {
            container.className = "question-options";
            document.getElementById("exam-multi-actions").classList.add("hidden");
        }

        const userSelected = examState.selectedAnswers[q.id] || [];

        q.options.forEach((optText, index) => {
            const letter = optText.charAt(0).toUpperCase();
            const div = document.createElement("div");
            div.className = "option-item";
            div.innerHTML = `
                <div class="opt-marker">${letter}</div>
                <div class="opt-text">${optText.substring(2).trim()}</div>
            `;

            if (userSelected.includes(letter)) {
                div.classList.add("selected");
            }

            // If exam submitted, show feedback colors
            if (examState.isSubmitted) {
                const isCorrect = q.answer.includes(letter);
                const isChosen = userSelected.includes(letter);

                if (isCorrect) {
                    div.classList.add("correct");
                } else if (isChosen && !isCorrect) {
                    div.classList.add("incorrect");
                }
            }

            // Click listener
            if (!examState.isSubmitted) {
                div.addEventListener("click", () => {
                    handleExamOptionClick(letter, q.type, div);
                });
            }

            container.appendChild(div);
        });

        renderExamNavigator();
    }

    // Handles option click in Exam
    function handleExamOptionClick(letter, type, element) {
        const q = examState.questions[examState.currentIndex];
        let currentSelection = examState.selectedAnswers[q.id] || [];

        if (type === "single") {
            examState.selectedAnswers[q.id] = [letter];
            // Auto advance on single choice
            setTimeout(() => {
                if (examState.currentIndex < examState.questions.length - 1 && !examState.isSubmitted) {
                    examState.currentIndex++;
                    renderExamQuestion();
                }
            }, 250);
        } else {
            if (currentSelection.includes(letter)) {
                currentSelection = currentSelection.filter(x => x !== letter);
            } else {
                currentSelection.push(letter);
            }
            examState.selectedAnswers[q.id] = currentSelection;
        }

        renderExamQuestion();
        updateExamAnsweredStats();
    }

    // Multiple selection confirm in exam
    document.getElementById("btn-exam-submit-multiple").addEventListener("click", () => {
        // Just advance to the next question
        if (examState.currentIndex < examState.questions.length - 1) {
            examState.currentIndex++;
            renderExamQuestion();
        }
    });

    // Update statistics on answered questions in exam
    function updateExamAnsweredStats() {
        const total = examState.questions.length;
        const answered = Object.keys(examState.selectedAnswers).filter(id => examState.selectedAnswers[id] && examState.selectedAnswers[id].length > 0).length;
        document.getElementById("exam-answered-count").textContent = answered;
    }

    // Render exam sidebar grid
    function renderExamNavigator() {
        const grid = document.getElementById("exam-navigator-grid");
        if (!grid) return;

        grid.innerHTML = "";
        examState.questions.forEach((q, idx) => {
            const item = document.createElement("span");
            item.className = "grid-item";
            item.textContent = idx + 1;

            if (idx === examState.currentIndex) {
                item.classList.add("active");
            }

            const chosen = examState.selectedAnswers[q.id] || [];
            if (chosen.length > 0) {
                item.classList.add("answered");
            }

            // Results highlights
            if (examState.isSubmitted) {
                const sortedSelected = [...chosen].sort().join("");
                const standardAns = q.answer.split("").sort().join("");
                const isCorrect = sortedSelected === standardAns;
                
                item.classList.remove("answered");
                if (isCorrect) {
                    item.classList.add("correct");
                } else {
                    item.classList.add("incorrect");
                }
            }

            item.addEventListener("click", () => {
                examState.currentIndex = idx;
                renderExamQuestion();
            });

            grid.appendChild(item);
        });
    }

    // Exam Nav buttons
    document.getElementById("btn-exam-prev").addEventListener("click", () => {
        if (examState.currentIndex > 0) {
            examState.currentIndex--;
            renderExamQuestion();
        }
    });

    document.getElementById("btn-exam-next").addEventListener("click", () => {
        if (examState.currentIndex < examState.questions.length - 1) {
            examState.currentIndex++;
            renderExamQuestion();
        }
    });

    // Submit Exam click handler
    document.getElementById("btn-submit-exam").addEventListener("click", () => {
        const unanswered = examState.questions.length - Object.keys(examState.selectedAnswers).filter(id => examState.selectedAnswers[id] && examState.selectedAnswers[id].length > 0).length;
        
        let confirmText = "您确认现在交卷吗？";
        if (unanswered > 0) {
            confirmText = `您还有 ${unanswered} 道题未作答，确定现在交卷吗？`;
        }

        if (confirm(confirmText)) {
            submitExam();
        }
    });

    // Score and submit
    function submitExam() {
        clearInterval(examState.timerInterval);
        examState.isSubmitted = true;

        let correctCount = 0;
        const timeSpent = examState.totalTime - examState.timeRemaining;

        examState.questions.forEach(q => {
            const chosen = examState.selectedAnswers[q.id] || [];
            const sortedSelected = [...chosen].sort().join("");
            const standardAns = q.answer.split("").sort().join("");
            
            const isCorrect = sortedSelected === standardAns;

            // Automatically update user answered states
            userProgress.answered[q.id] = {
                answered: true,
                correct: isCorrect,
                selected: chosen
            };

            if (isCorrect) {
                correctCount++;
            } else {
                // Automatically add to wrong questions collection
                if (!userProgress.wrongQuestions.includes(q.id)) {
                    userProgress.wrongQuestions.push(q.id);
                }
            }
        });

        saveProgress();

        // Calculate score based on 100 points
        const score = Math.round((correctCount / examState.questions.length) * 100);
        const accuracy = Math.round((correctCount / examState.questions.length) * 100);

        // --- Added for Leaderboard ---
        if (typeof submitScore === 'function') {
            submitScore('exam_' + examState.questions.length, score);
        }

        // Display results page
        document.getElementById("exam-active").classList.add("hidden");
        document.getElementById("exam-results").classList.remove("hidden");

        document.getElementById("result-score").textContent = score;
        document.getElementById("result-accuracy").textContent = `${accuracy}%`;
        document.getElementById("result-correct-count").textContent = `${correctCount} / ${examState.questions.length}`;
        
        // Time display
        const minSpent = Math.floor(timeSpent / 60);
        const secSpent = timeSpent % 60;
        document.getElementById("result-time-spent").textContent = `${minSpent}分 ${secSpent}秒`;

        initIcons();
    }

    // Results back buttons
    document.getElementById("btn-restart-setup").addEventListener("click", () => {
        document.getElementById("exam-results").classList.add("hidden");
        document.getElementById("exam-setup").classList.remove("hidden");
    });

    document.getElementById("btn-view-wrong-exams").addEventListener("click", () => {
        switchTab("wrong-collection");
    });

    // ==========================================
    // WRONG QUESTIONS COLLECTION
    // ==========================================
    
    function initWrongCollection() {
        const emptyEl = document.getElementById("wrong-empty");
        const activeEl = document.getElementById("wrong-active");

        if (userProgress.wrongQuestions.length === 0) {
            emptyEl.classList.remove("hidden");
            activeEl.classList.add("hidden");
            initIcons();
            return;
        }

        emptyEl.classList.add("hidden");
        activeEl.classList.remove("hidden");

        // Load wrong questions objects from database
        wrongState.questions = [];
        Object.keys(database).forEach(chId => {
            database[chId].questions.forEach(q => {
                if (userProgress.wrongQuestions.includes(q.id)) {
                    wrongState.questions.push(q);
                }
            });
        });

        // Safe indexing
        if (wrongState.currentIndex >= wrongState.questions.length) {
            wrongState.currentIndex = 0;
        }

        renderWrongQuestion();
    }

    function renderWrongQuestion() {
        const q = wrongState.questions[wrongState.currentIndex];
        if (!q) {
            initWrongCollection();
            return;
        }

        const progressNumEl = document.getElementById("wrong-progress-num");
        const progressBarFill = document.getElementById("wrong-progress-fill");

        progressNumEl.textContent = `${wrongState.currentIndex + 1} / ${wrongState.questions.length}`;
        const progressPercent = Math.round(((wrongState.currentIndex + 1) / wrongState.questions.length) * 100);
        progressBarFill.style.width = `${progressPercent}%`;

        // Type tag
        document.getElementById("wrong-question-type").textContent = q.type === "single" ? "单选题" : "多选题";

        // Navigator grid
        renderWrongGrid();

        // Stem
        document.getElementById("wrong-stem").textContent = q.stem;

        // Reset multiselect options
        wrongState.selectedOptions = [];

        // Options
        const container = document.getElementById("wrong-options");
        container.innerHTML = "";

        if (q.type === "multiple") {
            container.className = "question-options multiple-type";
            document.getElementById("wrong-multi-actions").classList.remove("hidden");
        } else {
            container.className = "question-options";
            document.getElementById("wrong-multi-actions").classList.add("hidden");
        }

        // We allow re-answering. Keep check status in wrongState, but if answered, display validation.
        // We'll hide validation until they select/answer in this wrong questions session.
        let sessionAnswered = false;
        let sessionCorrect = false;
        let sessionSelected = [];

        q.options.forEach((optText, index) => {
            const letter = optText.charAt(0).toUpperCase();
            const div = document.createElement("div");
            div.className = "option-item";
            div.innerHTML = `
                <div class="opt-marker">${letter}</div>
                <div class="opt-text">${optText.substring(2).trim()}</div>
            `;

            div.addEventListener("click", () => {
                handleWrongOptionClick(letter, q.type, div);
            });

            container.appendChild(div);
        });

        // Hide feedback panel initially
        document.getElementById("wrong-feedback").classList.add("hidden");
        initIcons();
    }

    function renderWrongGrid() {
        const grid = document.getElementById("wrong-grid");
        if (!grid) return;

        grid.innerHTML = "";
        wrongState.questions.forEach((q, idx) => {
            const item = document.createElement("span");
            item.className = "grid-item";
            item.textContent = idx + 1;

            if (idx === wrongState.currentIndex) {
                item.classList.add("active");
            }

            item.addEventListener("click", () => {
                wrongState.currentIndex = idx;
                renderWrongQuestion();
            });

            grid.appendChild(item);
        });
    }

    function handleWrongOptionClick(letter, type, element) {
        const q = wrongState.questions[wrongState.currentIndex];
        
        if (type === "single") {
            const isCorrect = q.answer === letter;
            displayWrongFeedback(isCorrect);
        } else {
            if (wrongState.selectedOptions.includes(letter)) {
                wrongState.selectedOptions = wrongState.selectedOptions.filter(x => x !== letter);
                element.classList.remove("selected");
            } else {
                wrongState.selectedOptions.push(letter);
                element.classList.add("selected");
            }
        }
    }

    // Submit multiple choice in wrong question
    document.getElementById("btn-wrong-submit-multiple").addEventListener("click", () => {
        const q = wrongState.questions[wrongState.currentIndex];
        if (!q || wrongState.selectedOptions.length === 0) return;

        const sortedSelected = [...wrongState.selectedOptions].sort().join("");
        const standardAns = q.answer.split("").sort().join("");
        
        const isCorrect = sortedSelected === standardAns;
        displayWrongFeedback(isCorrect);
    });

    function displayWrongFeedback(isCorrect) {
        const q = wrongState.questions[wrongState.currentIndex];
        const container = document.getElementById("wrong-options");
        const feedbackPanel = document.getElementById("wrong-feedback");
        const feedbackText = document.getElementById("wrong-feedback-text");
        const correctText = document.getElementById("wrong-feedback-correct-answer");
        const explanationBox = document.getElementById("wrong-explanation-detail-box");
        const explanationText = document.getElementById("wrong-feedback-explanation-text");

        // Clear option event listeners by cloning
        const optionItems = container.querySelectorAll(".option-item");
        optionItems.forEach(item => {
            const letter = item.getAttribute("data-letter");
            const shouldBeCorrect = q.answer.includes(letter);
            const chosen = q.type === "single" ? item.classList.contains("selected") || item.textContent.startsWith(letter) : wrongState.selectedOptions.includes(letter);

            if (shouldBeCorrect) {
                item.classList.add("correct");
            } else if (chosen && !shouldBeCorrect) {
                item.classList.add("incorrect");
            }
            
            // Remove click events (clone element)
            const cloned = item.cloneNode(true);
            item.parentNode.replaceChild(cloned, item);
        });

        // Hide multi submission action
        document.getElementById("wrong-multi-actions").classList.add("hidden");

        // Set feedback status text
        feedbackPanel.classList.remove("hidden");
        if (isCorrect) {
            feedbackText.textContent = "回答正确！继续努力！";
            feedbackText.className = "feedback-status correct";
        } else {
            feedbackText.textContent = "回答错误，记得仔细看解析哦。";
            feedbackText.className = "feedback-status incorrect";
            
            // shake
            const card = document.getElementById("wrong-question-card");
            card.classList.add("shake");
            setTimeout(() => card.classList.remove("shake"), 350);
        }

        correctText.textContent = q.answer;
        if (q.explanation) {
            explanationBox.classList.remove("hidden");
            explanationText.textContent = q.explanation;
        } else {
            explanationBox.classList.add("hidden");
        }
        initIcons();
    }

    // Remove from wrong questions
    document.getElementById("btn-remove-wrong").addEventListener("click", () => {
        const q = wrongState.questions[wrongState.currentIndex];
        if (!q) return;

        const idx = userProgress.wrongQuestions.indexOf(q.id);
        if (idx > -1) {
            userProgress.wrongQuestions.splice(idx, 1);
            saveProgress();
            
            // Remove from local active list
            wrongState.questions.splice(wrongState.currentIndex, 1);
            
            // Adjust current index
            if (wrongState.currentIndex >= wrongState.questions.length) {
                wrongState.currentIndex = Math.max(0, wrongState.questions.length - 1);
            }
            
            initWrongCollection();
        }
    });

    // Wrong collection navigation
    document.getElementById("btn-wrong-prev").addEventListener("click", () => {
        if (wrongState.currentIndex > 0) {
            wrongState.currentIndex--;
            renderWrongQuestion();
        }
    });

    document.getElementById("btn-wrong-next").addEventListener("click", () => {
        if (wrongState.currentIndex < wrongState.questions.length - 1) {
            wrongState.currentIndex++;
            renderWrongQuestion();
        }
    });

    // ==========================================
    // FLASHCARDS / SUBJECTIVE MEMORIZATION
    // ==========================================
    
    function initFlashcardSetup() {
        const select = document.getElementById("flashcard-chapter-select");
        if (!select || !database) return;

        select.innerHTML = "";
        Object.keys(database).forEach(chId => {
            const chName = database[chId].name;
            const count = getChapterQuestionsCount(chId, ["short", "essay"]);
            if (count === 0) return;
            
            const opt = document.createElement("option");
            opt.value = chId;
            opt.textContent = `${chName} (${count} 题)`;
            select.appendChild(opt);
        });

        // Toggle visibility
        document.getElementById("flashcard-setup").classList.remove("hidden");
        document.getElementById("flashcard-active-view").classList.add("hidden");
    }

    // Start flashcard背诵
    document.getElementById("btn-start-flashcard").addEventListener("click", () => {
        const chId = document.getElementById("flashcard-chapter-select").value;
        if (!chId) {
            alert("没有可选择的主观题章节！");
            return;
        }

        flashcardState.chapterId = chId;
        flashcardState.questions = database[chId].questions.filter(q => q.type === "short" || q.type === "essay");
        flashcardState.currentIndex = 0;
        flashcardState.isFlipped = false;

        if (flashcardState.questions.length === 0) {
            alert("该章节没有可供背诵的简答或论述题！");
            return;
        }

        document.getElementById("flashcard-setup").classList.add("hidden");
        document.getElementById("flashcard-active-view").classList.remove("hidden");

        renderFlashcard();
    });

    function renderFlashcard() {
        const q = flashcardState.questions[flashcardState.currentIndex];
        
        // Navigator text
        document.getElementById("flashcard-progress-num").textContent = `第 ${flashcardState.currentIndex + 1} / ${flashcardState.questions.length} 题`;

        // Card tag
        const tag = document.getElementById("flashcard-type");
        tag.textContent = q.type === "short" ? "简答题" : "论述题";

        // Questions and standard answer texts
        document.getElementById("flashcard-question").textContent = q.stem.replace(/^\d+[\.．\s]*/, "").trim();
        
        // Format answer to display neatly
        let formattedAnswer = q.answer;
        if (formattedAnswer.includes("参考答案：")) {
            formattedAnswer = formattedAnswer.replace("参考答案：", "");
        }
        formattedAnswer = formattedAnswer.replace(/^\d+[\.．\s]*/, "").trim();
        
        document.getElementById("flashcard-answer").textContent = formattedAnswer;

        // Reset flip state
        const cardBox = document.getElementById("flashcard-box");
        cardBox.classList.remove("flipped");
        flashcardState.isFlipped = false;

        // Highlight mastered states on buttons
        const masteredBtn = document.getElementById("btn-flashcard-mastered");
        if (userProgress.masteredFlashcards.includes(q.id)) {
            masteredBtn.classList.add("btn-success");
            masteredBtn.innerHTML = `<i data-lucide="check-circle"></i> 已掌握 (可重新评估)`;
        } else {
            masteredBtn.classList.remove("btn-success");
            masteredBtn.innerHTML = `<i data-lucide="check-circle"></i> 标记已掌握`;
        }

        initIcons();
    }

    // Card Flip Animation Trigger
    document.getElementById("flashcard-box").addEventListener("click", () => {
        const cardBox = document.getElementById("flashcard-box");
        cardBox.classList.toggle("flipped");
        flashcardState.isFlipped = !flashcardState.isFlipped;
    });

    // Mastery Action Buttons
    document.getElementById("btn-flashcard-mastered").addEventListener("click", () => {
        const q = flashcardState.questions[flashcardState.currentIndex];
        if (!userProgress.masteredFlashcards.includes(q.id)) {
            userProgress.masteredFlashcards.push(q.id);
            saveProgress();
        }
        
        // Auto advance to next card
        setTimeout(advanceFlashcard, 300);
    });

    document.getElementById("btn-flashcard-unmastered").addEventListener("click", () => {
        const q = flashcardState.questions[flashcardState.currentIndex];
        const idx = userProgress.masteredFlashcards.indexOf(q.id);
        if (idx > -1) {
            userProgress.masteredFlashcards.splice(idx, 1);
            saveProgress();
        }
        
        // Auto advance to next card
        setTimeout(advanceFlashcard, 300);
    });

    function advanceFlashcard() {
        if (flashcardState.currentIndex < flashcardState.questions.length - 1) {
            flashcardState.currentIndex++;
            renderFlashcard();
        } else {
            alert("您已完成本章全部主观题背诵！");
            initFlashcardSetup();
        }
    }

    // Flashcard navigation
    document.getElementById("btn-flashcard-prev").addEventListener("click", (e) => {
        e.stopPropagation(); // prevent flipping card
        if (flashcardState.currentIndex > 0) {
            flashcardState.currentIndex--;
            renderFlashcard();
        }
    });

    document.getElementById("btn-flashcard-next").addEventListener("click", (e) => {
        e.stopPropagation(); // prevent flipping card
        if (flashcardState.currentIndex < flashcardState.questions.length - 1) {
            flashcardState.currentIndex++;
            renderFlashcard();
        }
    });

    document.getElementById("btn-flashcard-back-setup").addEventListener("click", () => {
        initFlashcardSetup();
    });

    // ==========================================
    // THEME SWITCH / STYLING CONTROLLER
    // ==========================================
    const themeBtn = document.getElementById("theme-toggle");
    
    // Check local storage for theme preference
    const storedTheme = localStorage.getItem("maogai_theme");
    if (storedTheme === "light") {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
    } else {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
    }

    themeBtn.addEventListener("click", () => {
        if (document.body.classList.contains("dark-theme")) {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
            localStorage.setItem("maogai_theme", "light");
        } else {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
            localStorage.setItem("maogai_theme", "dark");
        }
    });

    // ==========================================
    // LEADERBOARD & LOGIN SYSTEM
    // ==========================================
    let currentUser = localStorage.getItem("maogai_username") || "";
    let lastPracticeScore = 0;
    
    // Initialize lastPracticeScore from local progress so we don't spam 1s on reload
    setTimeout(() => {
        let initCorrect = 0;
        Object.keys(userProgress.answered).forEach(qid => {
            if (userProgress.answered[qid].correct) initCorrect++;
        });
        lastPracticeScore = initCorrect;
    }, 500);

    const loginModal = document.getElementById("login-modal");
    const loginInput = document.getElementById("login-username");
    const btnLogin = document.getElementById("btn-login");
    let currentLeaderboardTab = "practice";

    function checkLogin() {
        if (!currentUser) {
            loginModal.classList.add("active");
            document.body.style.overflow = "hidden"; // Prevent scrolling
        } else {
            fetchLeaderboard();
        }
    }

    btnLogin.addEventListener("click", () => {
        const name = loginInput.value.trim();
        if (name) {
            currentUser = name;
            localStorage.setItem("maogai_username", name);
            loginModal.classList.remove("active");
            document.body.style.overflow = "auto";
            
            // Sync current local score to server on first login
            submitScore('practice', lastPracticeScore);
            fetchLeaderboard();
        } else {
            alert("请输入您的昵称！");
        }
    });

    async function fetchLeaderboard() {
        if (!currentUser) return;
        try {
            const response = await fetch("api/leaderboard");
            if (response.ok) {
                const data = await response.json();
                renderLeaderboard(data[currentLeaderboardTab]);
            }
        } catch (error) {
            console.error("Failed to fetch leaderboard:", error);
        }
    }

    window.submitScore = async function(category, score) {
        if (!currentUser) return;
        try {
            await fetch("api/leaderboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: currentUser,
                    category: category,
                    score: score
                })
            });
            fetchLeaderboard(); // refresh after submitting
        } catch (error) {
            console.error("Failed to submit score:", error);
        }
    }

    function renderLeaderboard(listData) {
        const listEl = document.getElementById("leaderboard-list");
        if (!listEl) return;
        listEl.innerHTML = "";
        
        if (!listData || listData.length === 0) {
            listEl.innerHTML = `<div class="lb-empty"><i data-lucide="inbox"></i> 暂无数据，快来抢占榜首！</div>`;
            initIcons();
            return;
        }

        listData.forEach((item, index) => {
            const rank = index + 1;
            const li = document.createElement("li");
            li.className = "lb-item" + (item.username === currentUser ? " highlight-me" : "");
            
            let rankHtml = `<span class="lb-rank">${rank}</span>`;
            if (rank === 1) rankHtml = `<span class="lb-rank rank-1"><i data-lucide="crown"></i></span>`;
            else if (rank === 2) rankHtml = `<span class="lb-rank rank-2">${rank}</span>`;
            else if (rank === 3) rankHtml = `<span class="lb-rank rank-3">${rank}</span>`;

            li.innerHTML = `
                ${rankHtml}
                <span class="lb-user" title="${item.username}">${item.username}</span>
                <span class="lb-score">${item.score} ${currentLeaderboardTab === 'practice' ? '题' : '分'}</span>
            `;
            listEl.appendChild(li);
        });
        initIcons();
    }

    // Bind Leaderboard Tabs
    document.querySelectorAll(".lb-tab").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".lb-tab").forEach(b => b.classList.remove("active"));
            e.currentTarget.classList.add("active");
            currentLeaderboardTab = e.currentTarget.getAttribute("data-lb");
            fetchLeaderboard();
        });
    });

    const refreshBtn = document.getElementById("btn-refresh-lb");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            fetchLeaderboard();
        });
    }

    // Start auto-refresh
    setInterval(fetchLeaderboard, 10000);
    
    // Check login on startup
    checkLogin();

    // Start App Loader
    loadDatabase();
});
