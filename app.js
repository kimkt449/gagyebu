let currentDate = new Date(); // 현재 날짜
let pieChartInstance = null;
let spendingData = {}; // 전역 지출 데이터 저장
const updateSummaryTable = (income, expense) => {
  document.getElementById("totalIncome").textContent = income.toLocaleString();
  document.getElementById("totalExpense").textContent =
    expense.toLocaleString();
};

const makeCalendar = (date) => {
  const currentMonth = date.getMonth() + 1;
  const currentYear = date.getFullYear();

  // 달력 생성
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const lastDay = new Date(currentYear, currentMonth, 0).getDate();

  const limitDay = firstDay + lastDay;
  const nextDay = Math.ceil(limitDay / 7) * 7;

  let htmlDummy = "";

  for (let i = 0; i < firstDay; i++) {
    htmlDummy += `<div class="noColor"></div>`;
  }

  for (let i = 1; i <= lastDay; i++) {
    const formattedDate = `${currentMonth}/${i}`;
    const savedData = JSON.parse(localStorage.getItem(formattedDate)) || [];
    let totalAmount = savedData.reduce(
      (acc, data) => acc + (data.income - data.expense),
      0
    );

    // 총합금액에 따라 스타일 지정
    const formattedAmount =
      totalAmount > 0
        ? `+${totalAmount.toLocaleString()}`
        : `${totalAmount.toLocaleString()}`;
    const amountClass = totalAmount > 0 ? "positive" : "negative";

    htmlDummy += `<div data-date="${formattedDate}">${i}<br><span class="${
      totalAmount !== 0 ? amountClass : ""
    }">${totalAmount !== 0 ? formattedAmount : ""}</span></div>`;
  }

  for (let i = limitDay; i < nextDay; i++) {
    htmlDummy += `<div class="noColor"></div>`;
  }

  document.querySelector(".dateBoard").innerHTML = htmlDummy;
  document.querySelector(
    ".dateTitle"
  ).innerText = `${currentYear}년 ${currentMonth}월`;

  // 날짜 클릭 이벤트 추가
  document.querySelectorAll(".dateBoard div").forEach((dateDiv) => {
    dateDiv.onclick = () => {
      // 기존의 active 클래스 제거
      document
        .querySelectorAll(".dateBoard div.active")
        .forEach((activeDiv) => {
          activeDiv.classList.remove("active");
        });

      // 현재 클릭된 날짜에 active 클래스 추가
      dateDiv.classList.add("active");

      const formattedDate = document
        .querySelector(".dateBoard div.active")
        .getAttribute("data-date");

      // 표와 버튼을 표시
      document.querySelector(".tableContainer").style.display = "block";
      document.querySelector("#addRowBtn").style.display = "block";
      document.querySelector("#saveDataBtn").style.display = "block";

      // 기존 데이터 불러오기
      let tableContent = "";
      let savedData = JSON.parse(localStorage.getItem(formattedDate)) || [];
      savedData.forEach((data, i) => {
        tableContent += createRowHTML(i + 1, formattedDate, data);
      });

      // 기본 10줄 생성 (저장된 데이터가 부족한 경우)
      for (let i = savedData.length; i < 10; i++) {
        tableContent += createRowHTML(i + 1, formattedDate);
      }
      document.querySelector(".tableContainer tbody").innerHTML = tableContent;

      let rowCount = savedData.length >= 10 ? savedData.length : 10;

      // 행 추가 버튼 클릭 이벤트
      document.querySelector("#addRowBtn").onclick = () => {
        rowCount++;
        const newRow = createRowHTML(rowCount, formattedDate);
        document
          .querySelector(".tableContainer tbody")
          .insertAdjacentHTML("beforeend", newRow);
      };

      // 저장 버튼 클릭 이벤트 (로컬스토리지에 저장)
      document.querySelector("#saveDataBtn").onclick = () => {
        let newData = [];
        let totalAmount = 0;
        let categoryData = {}; // 월별로 누적된 지출 데이터를 저장할 객체

        document.querySelectorAll(".tableContainer tbody tr").forEach((row) => {
          const content = row.querySelector('input[type="text"]').value;
          const expense =
            parseFloat(
              row.querySelector('input[placeholder="지출금액 입력"]').value
            ) || 0;
          const income =
            parseFloat(
              row.querySelector('input[placeholder="수입금액 입력"]').value
            ) || 0;
          const categorySelect = row.querySelector('select[name="category"]');
          const category =
            categorySelect.value === "직접 입력"
              ? row.querySelector("input.custom-input").value
              : categorySelect.value;
          const methodSelect = row.querySelector('select[name="method"]');
          const method =
            methodSelect.value === "직접 입력"
              ? row.querySelector("input.custom-input-method").value
              : methodSelect.value;

          newData.push({ content, expense, income, category, method });
          totalAmount += income - expense;

          // 월별로 지출 데이터 누적
          if (expense > 0) {
            if (categoryData[category]) {
              categoryData[category] += expense;
            } else {
              categoryData[category] = expense;
            }
          }
        });

        const formattedDate = document
          .querySelector(".dateBoard div.active")
          .getAttribute("data-date");

        // 로컬 스토리지에 새로운 데이터를 저장
        localStorage.setItem(formattedDate, JSON.stringify(newData));

        // 해당 날짜의 지출을 전역 지출 데이터에 저장
        const dateObj = new Date(`${formattedDate}/2024`); // 날짜 형식을 맞춰서 처리
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        const day = dateObj.getDate();

        if (!spendingData[year]) spendingData[year] = {};
        if (!spendingData[year][month]) spendingData[year][month] = {};
        spendingData[year][month][day] = totalAmount;

        // 화면에 총합 금액 표시
        const amountClass = totalAmount > 0 ? "positive" : "negative";
        const formattedAmount =
          totalAmount > 0
            ? `+${totalAmount.toLocaleString()}`
            : `${totalAmount.toLocaleString()}`;
        const dateDiv = document.querySelector(
          `.dateBoard div[data-date="${formattedDate}"]`
        );
        dateDiv.innerHTML = `${day}<br><span class="${amountClass}">${formattedAmount}</span>`;

        // 월별 지출 데이터를 합산하여 원그래프 데이터 생성 및 업데이트
        updatePieChartForMonth(year, month);
      };
      // 원그래프를 누적된 금액으로 업데이트하는 함수
      const updatePieChartWithCumulativeData = (categoryData) => {
        const ctx = document.getElementById("pieChart").getContext("2d");

        if (pieChartInstance) {
          pieChartInstance.destroy(); // 기존 원그래프 인스턴스 삭제
        }
        const totalAmount = Object.values(categoryData).reduce(
          (sum, amount) => sum + amount,
          0
        );
        pieChartInstance = new Chart(ctx, {
          type: "pie",
          data: generatePieChartData(categoryData),
          options: {
            responsive: true,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                enabled: false,
                callbacks: {
                  label: function (tooltipItem) {
                    return `${
                      tooltipItem.label
                    }: ${tooltipItem.raw.toLocaleString()}원`;
                  },
                },
              },
              datalabels: {
                color: "black", // 데이터 레이블 텍스트 색상
                formatter: (value, ctx) => {
                  let label = ctx.chart.data.labels[ctx.dataIndex];
                  const percentage = ((value / totalAmount) * 100).toFixed(1); // 비율 계산
                  return `${label}\n${value.toLocaleString()}원\n${percentage}%`;
                },
                align: "end", // 레이블의 위치 조정
                anchor: "center", // 레이블을 원 내부 중앙에 위치
                font: {
                  weight: "bold",
                },
                padding: 6,
              },
            },
          },
          plugins: [ChartDataLabels], // Chart.js DataLabels 플러그인 사용
        });
      };
      // 월별 지출 데이터를 합산하여 원그래프 업데이트
      const updatePieChartForMonth = (year, month) => {
        let categoryData = {};
        let totalIncome = 0;
        let totalExpense = 0;
        // 해당 월의 모든 날짜 지출 데이터 누적
        for (let day = 1; day <= 31; day++) {
          const formattedDate = `${month + 1}/${day}`;
          const savedData =
            JSON.parse(localStorage.getItem(formattedDate)) || [];
          savedData.forEach((data) => {
            if (data.expense > 0) {
              if (categoryData[data.category]) {
                categoryData[data.category] += data.expense;
              } else {
                categoryData[data.category] = data.expense;
              }
            }
            if (data.income > 0) {
              totalIncome += data.income;
            }
            if (data.expense > 0) {
              totalExpense += data.expense;
            }
          });
        }

        // 원그래프 업데이트
        updatePieChartWithCumulativeData(categoryData);
        // 표 업데이트
        updateSummaryTable(totalIncome, totalExpense);
      };
      document.querySelectorAll(".categorySelect").forEach((select) => {
        select.addEventListener("change", (e) => {
          const row = e.target.closest("tr");
          const customInput = row.querySelector(".custom-input");
          if (e.target.value === "직접 입력") {
            customInput.style.display = "block";
          } else {
            customInput.style.display = "none";
          }
        });
      });
    };
  });
};

// 행 생성 함수 (저장된 데이터를 불러와서 표시) - '분류'와 '지출방법'을 select로 변경
const createRowHTML = (rowNumber, date, data = {}) => {
  return `
    <tr>
      <td>${rowNumber}</td>
      <td>${date}</td>
      <td><input type="text" value="${
        data.content || ""
      }" placeholder="내용 입력"></td>
      <td><input type="number" value="${
        data.expense || ""
      }" placeholder="지출금액 입력"></td>
      <td><input type="number" value="${
        data.income || ""
      }" placeholder="수입금액 입력"></td>
      <td>
        <select name="category" class="categorySelect">
          <option value="">선택</option>
          <option value="식비" ${
            data.category === "식비" ? "selected" : ""
          }>식비</option>
          <option value="교통비" ${
            data.category === "교통비" ? "selected" : ""
          }>교통비</option>
          <option value="건강" ${
            data.category === "건강" ? "selected" : ""
          }>건강</option>
          <option value="생활용품" ${
            data.category === "생활용품" ? "selected" : ""
          }>생활용품</option>
          <option value="교육비" ${
            data.category === "교육비" ? "selected" : ""
          }>교육비</option>
          <option value="경조사" ${
            data.category === "경조사" ? "selected" : ""
          }>경조사</option>
          <option value="보험료" ${
            data.category === "보험료" ? "selected" : ""
          }>보험료</option>
          <option value="주거" ${
            data.category === "주거" ? "selected" : ""
          }>주거</option>
          <option value="직접 입력" ${
            data.category === "직접 입력" ? "selected" : ""
          }>직접 입력</option>
        </select>
        <input type="text" class="custom-input" value="${
          data.category === "직접 입력" ? data.category : ""
        }" />
      </td>
      <td>
        <select name="method">
          <option value="">선택</option>
          <option value="신용카드" ${
            data.method === "신용카드" ? "selected" : ""
          }>신용카드</option>
          <option value="체크카드" ${
            data.method === "체크카드" ? "selected" : ""
          }>체크카드</option>
          <option value="현금" ${
            data.method === "현금" ? "selected" : ""
          }>현금</option>
          <option value="계좌이체" ${
            data.method === "계좌이체" ? "selected" : ""
          }>계좌이체</option>
        </select>
      </td>
    </tr>`;
};

// 원그래프 생성 함수
const createPieChart = (categoryData) => {
  const ctx = document.getElementById("pieChart").getContext("2d");
  const totalAmount = Object.values(categoryData).reduce(
    (sum, amount) => sum + amount,
    0
  );
  new Chart(ctx, {
    type: "pie",
    data: generatePieChartData(categoryData),
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
          callbacks: {
            label: function (tooltipItem) {
              return `${
                tooltipItem.label
              }: ${tooltipItem.raw.toLocaleString()}원`;
            },
          },
        },

        datalabels: {
          color: "black", // 데이터 레이블 텍스트 색상
          formatter: (value, ctx) => {
            let label = ctx.chart.data.labels[ctx.dataIndex];
            const percentage = ((value / totalAmount) * 100).toFixed(1); // 비율 계산
            return `${label}\n${value.toLocaleString()}원\n${percentage}%`;
          },
          align: "end", // 레이블의 위치 조정
          anchor: "center", // 레이블을 원 내부 중앙에 위치
          font: {
            weight: "bold",
          },
          padding: 6,
        },
      },
    },
    plugins: [ChartDataLabels], // Chart.js DataLabels 플러그인 사용
  });
};
const generatePieChartData = (categoryData) => {
  const labels = Object.keys(categoryData);
  const data = Object.values(categoryData);

  return {
    labels: labels,
    datasets: [
      {
        data: data,
        backgroundColor: [
          "rgba(255, 99, 132, 0.2)",
          "rgba(54, 162, 235, 0.2)",
          "rgba(255, 206, 86, 0.2)",
          "rgba(75, 192, 192, 0.2)",
          "rgba(153, 102, 255, 0.2)",
          "rgba(255, 159, 64, 0.2)",
          "rgba(199, 199, 199, 0.2)",
          "rgba(83, 102, 255, 0.2)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 159, 64, 1)",
          "rgba(199, 199, 199, 1)",
          "rgba(83, 102, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };
};

const updatePieChart = (categoryData) => {
  const ctx = document.getElementById("pieChart").getContext("2d");

  if (pieChartInstance) {
    pieChartInstance.destroy(); // 기존 차트 인스턴스 삭제
  }
  const totalAmount = Object.values(categoryData).reduce(
    (sum, amount) => sum + amount,
    0
  );
  pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: generatePieChartData(categoryData),
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
          callbacks: {
            label: function (tooltipItem) {
              return `${
                tooltipItem.label
              }: ${tooltipItem.raw.toLocaleString()}원`;
            },
          },
        },
        datalabels: {
          color: "black", // 데이터 레이블 텍스트 색상
          formatter: (value, ctx) => {
            let label = ctx.chart.data.labels[ctx.dataIndex];
            const percentage = ((value / totalAmount) * 100).toFixed(1); // 비율 계산
            return `${label}\n${value.toLocaleString()}원\n${percentage}%`;
          },
          align: "end", // 레이블의 위치 조정
          anchor: "center", // 레이블을 원 내부 중앙에 위치
          font: {
            weight: "bold",
          },
          padding: 6,
        },
      },
    },
    plugins: [ChartDataLabels], // Chart.js DataLabels 플러그인 사용
  });
};
const date = new Date();
makeCalendar(date);

// 초기 달력 및 버튼 설정
makeCalendar(currentDate);

// 이전 달 이동
document.querySelector(".prevDay").onclick = () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
  makeCalendar(currentDate);
  updatePieChartForMonth(currentDate.getFullYear(), currentDate.getMonth());
  initializePieChart();
};

// 다음 달 이동
document.querySelector(".nextDay").onclick = () => {
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
  makeCalendar(currentDate);
  updatePieChartForMonth(currentDate.getFullYear(), currentDate.getMonth());
  initializePieChart();
};
const updatePieChartForMonth = (year, month) => {
  let categoryData = {};
  let totalIncome = 0;
  let totalExpense = 0;

  // 해당 월의 모든 날짜 지출 데이터 누적
  for (let day = 1; day <= 31; day++) {
    const dateKey = `${year}-${month + 1}-${day}`; // 날짜 형식 맞추기 (예: 2024-9-1)
    if (
      spendingData[year] &&
      spendingData[year][month] &&
      spendingData[year][month][day]
    ) {
      const dailySpending = spendingData[year][month][day];

      // 월 전체의 지출 데이터를 누적
      for (const category in spendingData[year][month]) {
        if (!categoryData[category]) {
          categoryData[category] = 0;
        }
        categoryData[category] += dailySpending;
      }
    }
    updatePieChartWithCumulativeData(categoryData);
  }

  // 현재 월의 원그래프 초기화

  // 'category' 및 'method'의 직접 입력 기능 제어
  document.addEventListener("change", (event) => {
    if (event.target.classList.contains("category-select")) {
      const select = event.target;
      const input = select.nextElementSibling;
      input.style.display = select.value === "직접 입력" ? "block" : "none";
    }
    if (event.target.classList.contains("method-select")) {
      const select = event.target;
      const input = select.nextElementSibling;
      input.style.display = select.value === "직접 입력" ? "block" : "none";
    }
  });

  // 페이지 로드 시 호출하여 가장 최근 지출 합산 금액 표시
};

const initializePieChart = () => {
  const ctx = document.getElementById("pieChart").getContext("2d");

  // 현재 월을 기준으로 원그래프 데이터 생성
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const generateFixedColors = (numColors) => {
    const colors = [
      "rgba(255, 99, 132, 0.2)",
      "rgba(54, 162, 235, 0.2)",
      "rgba(255, 206, 86, 0.2)",
      "rgba(75, 192, 192, 0.2)",
      "rgba(153, 102, 255, 0.2)",
      "rgba(255, 159, 64, 0.2)",
      "rgba(199, 199, 199, 0.2)",
      "rgba(83, 102, 255, 0.2)",
    ];
    return colors.slice(0, numColors);
  };

  let categoryData = {};
  let totalIncome = 0;
  let totalExpense = 0;

  // 해당 월의 모든 날짜 지출 데이터 누적
  for (let day = 1; day <= 31; day++) {
    const formattedDate = `${currentMonth + 1}/${day}`;
    const savedData = JSON.parse(localStorage.getItem(formattedDate)) || [];
    savedData.forEach((data) => {
      if (data.expense > 0) {
        if (categoryData[data.category]) {
          categoryData[data.category] += data.expense;
        } else {
          categoryData[data.category] = data.expense;
        }
      }
      if (data.income > 0) {
        totalIncome += data.income;
      }
      if (data.expense > 0) {
        totalExpense += data.expense;
      }
    });
  }
  const categoryLabels = Object.keys(categoryData);
  const savedColors =
    JSON.parse(localStorage.getItem("pieChartColors")) ||
    generateFixedColors(categoryLabels.length);
  localStorage.setItem("pieChartColors", JSON.stringify(savedColors));

  updatePieChartWithCumulativeData(categoryData, savedColors);
  updateSummaryTable(totalIncome, totalExpense);
};
const updatePieChartWithCumulativeData = (categoryData) => {
  const ctx = document.getElementById("pieChart").getContext("2d");
  const totalAmount = Object.values(categoryData).reduce(
    (sum, amount) => sum + amount,
    0
  );
  if (pieChartInstance) {
    pieChartInstance.destroy(); // 기존 원그래프 인스턴스 삭제
  }

  pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: generatePieChartData(categoryData),
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
          callbacks: {
            label: function (tooltipItem) {
              return `${
                tooltipItem.label
              }: ${tooltipItem.raw.toLocaleString()}원`;
            },
          },
        },
        datalabels: {
          color: "black", // 데이터 레이블 텍스트 색상
          formatter: (value, ctx) => {
            let label = ctx.chart.data.labels[ctx.dataIndex];
            const percentage = ((value / totalAmount) * 100).toFixed(1); // 비율 계산
            return `${label}\n${value.toLocaleString()}원\n${percentage}%`;
          },
          align: "end", // 레이블의 위치 조정
          anchor: "center", // 레이블을 원 내부 중앙에 위치
          font: {
            weight: "bold",
          },
          padding: 6,
        },
      },
    },
    plugins: [ChartDataLabels], // Chart.js DataLabels 플러그인 사용
  });
};
document.addEventListener("DOMContentLoaded", () => {
  makeCalendar(currentDate);
  initializePieChart();
});
function generateFixedColors(count) {
  const baseColors = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#FF9F40",
    "#FFCD56",
    "#36A2EB",
    "#FF6384",
    "#4BC0C0",
    "#FF9F40",
  ];

  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }

  return colors;
}
