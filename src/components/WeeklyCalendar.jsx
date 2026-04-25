const WeeklyCalendar = ({ days }) => (
  <div className="weekly-calendar">
    <div className="section-title">This Week</div>
    <div className="week-grid">
      {days.map((day) => (
        <div
          key={day.dateStr}
          className={`week-day ${day.isToday ? "today" : ""} ${
            day.present ? "present" : "absent"
          } ${day.isFuture ? "future" : ""}`}
        >
          <span className="week-day-label">{day.label}</span>
          <span className="week-day-date">{day.date}</span>
          {!day.isFuture ? <span className="week-dot" /> : null}
        </div>
      ))}
    </div>
    <div className="week-legend">
      <span>
        <i className="dot dot-green" /> Present
      </span>
      <span>
        <i className="dot dot-red" /> Absent
      </span>
    </div>
  </div>
);

export default WeeklyCalendar;
