import moment from "moment";
import knex from "knexClient";

export default async function getAvailabilities(date, numberOfDays = 7) {
  let currentDate = moment(date);
  let nextIteration = 0;

  const availabilities = new Map();

  for (let i = 0; i < numberOfDays; ++i) {
    const tmpDate = moment(date).add(i, "days");

    availabilities.set(i, {
      date: tmpDate.toDate(),
      slots: []
    });
  }

  const events = await knex
    .select("kind", "starts_at", "ends_at", "weekly_recurring")
    .from("events")
    .where(function () {
      this.where("weekly_recurring", true).orWhere("ends_at", ">", +date);
    });

  let appointments = events.filter(event => event.kind === "appointment");
  let openings = events.filter(event => event.kind === "opening");

  for (let i = 0; i < numberOfDays; ++i) {
    const day = availabilities.get(i);

    for (let j = 0; j < openings.length; ++j) {
      if (currentDate.format("D-MM-Y") === moment(openings[j].starts_at).format("D-MM-Y")) 
        assignSlot(currentDate, openings[j], day, appointments);

      else if (openings[j].starts_at < currentDate && openings[j].weekly_recurring &&
        currentDate.format("ddd") === moment(openings[j].starts_at).format("ddd")) {
        assignSlot(currentDate, openings[j], day, appointments);
      }
    }

    if (currentDate.format("d") == 6) ++nextIteration;
    currentDate.add(1, "days");
  }

  return Array.from(availabilities.values());
}

function assignSlot(currentDate, opening, day, appointments) {
  let tempDate = currentDate;
  let startTime = moment(opening.starts_at);
  let endTime = moment(opening.ends_at);

  tempDate.set({
    h: moment(opening.starts_at).format("H"),
    m: moment(opening.starts_at).format("mm")
  });

  while (startTime < endTime) {
    if (!isAppointment(tempDate, appointments)) {
      day.slots.push(tempDate.format("H:mm"));
    }
    tempDate.add(30, "Minutes");
    startTime.add(30, "Minutes");
  }
}

function isAppointment(date, appointments) {
  let flag = false;
  appointments.forEach(appointment => {
    if (date >= appointment.starts_at && date < appointment.ends_at)
      flag = true;
  });
  return flag;
}