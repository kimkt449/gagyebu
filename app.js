const makeCalendar = (date) => {
  const currentYear = new Date(date).getFullYear();
  const currentMonth = new Date(date).getMonth() + 1;

  const firstDay = new Date(date.setDate(1)).getDay();
  const lastDay = new Date(currentYear, currentMonth, 0).getDate();

  const limitDay = firstDay + lastDay;
  const nextDay = Math.ceil(limitDay / 7) * 7;

  let htmlDummy = "";

  for (let i = 0; i < firstDay; i++) {
    htmlDummy += `<div class="noColor"></div>`;
  }

  for (let i = 1; i <= lastDay; i++) {
    htmlDummy += `<div>${i}</div>`;
  }

  for (let i = limitDay; i < nextDay; i++) {
    htmlDummy += `<div class="noColor"></div>`;
  }

  document.querySelector(`.dateBoard`).innerHTML = htmlDummy;
  document.querySelector(
    `.dateTitle`
  ).innerText = `${currentYear}년 ${currentMonth}월`;

  // 날짜 클릭 이벤트 추가
  document.querySelectorAll(".dateBoard div").forEach((dateDiv, index) => {
    dateDiv.onclick = () => {
      // 날짜를 클릭했을 때 표를 표시
      document.querySelector(".tableContainer").style.display = "block";
      document.querySelector("#addRowBtn").style.display = "block";

      // 선택된 날짜의 월과 일을 가져옴
      const selectedDay = dateDiv.innerText;
      const formattedDate = `${currentMonth}/${selectedDay}`;

      // 표의 내용을 생성
      let tableContent = "";
      for (let i = 0; i < 10; i++) {
        tableContent += `
            <tr>
              <td>${i + 1}</td>
              <td>${formattedDate}</td>
              <td><input type="text" placeholder="내용 입력"></td>
              <td><input type="number" placeholder="지출금액 입력"></td>
              <td><input type="number" placeholder="수입금액 입력"></td>
              <td><input type="text" placeholder="분류 입력"></td>
              <td><input type="text" placeholder="지출방법 입력"></td>
            </tr>`;
      }
      document.querySelector("#addRowBtn").onclick = () => {
        let rowCount = 10;
        rowCount++;
        const newRow = createRowHTML(rowCount, formattedDate);
        document.querySelector("tbody").insertAdjacentHTML("beforeend", newRow);
      };

      // 표의 내용 업데이트
      document.querySelector("tbody").innerHTML = tableContent;
      let rowCount = 10;
      document.querySelector("#addRowBtn").onclick = () => {
        rowCount++;
        const newRow = createRowHTML(rowCount, formattedDate);
        document.querySelector("tbody").insertAdjacentHTML("beforeend", newRow);
      };
    };
  });
};

const createRowHTML = (rowNumber, date) => {
  return `
      <tr>
        <td>${rowNumber}</td>
        <td>${date}</td>
        <td><input type="text" placeholder="내용 입력"></td>
        <td><input type="number" placeholder="지출금액 입력"></td>
        <td><input type="number" placeholder="수입금액 입력"></td>
        <td><input type="text" placeholder="분류 입력"></td>
        <td><input type="text" placeholder="지출방법 입력"></td>
      </tr>`;
};

const date = new Date();

makeCalendar(date);

// 이전달 이동
document.querySelector(`.prevDay`).onclick = () => {
  makeCalendar(new Date(date.setMonth(date.getMonth() - 1)));
};

// 다음달 이동
document.querySelector(`.nextDay`).onclick = () => {
  makeCalendar(new Date(date.setMonth(date.getMonth() + 1)));
};
