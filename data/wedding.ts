import type { EventId, InviteType } from "@/lib/types";

export type { EventId };

export type WeddingEvent = {
  id: EventId;
  title: string;
  visibleTo: InviteType[];
  time: string;
  venue: string;
  address: string;
  dress: string;
  militaryDress?: string;
  travel: string;
  notes: string;
};

export type TimelineItem = {
  id: string;
  eventId: EventId;
  time: string;
  title: string;
  detail: string;
};

export type LogisticsLink = {
  label: string;
  href: string;
};

// A journey to the church, or back to where someone is staying.
export type LogisticsJourney = {
  text: string;
  publicTransport: string;
  publicTransportTime: string;
  publicTransportCost: string;
};

export type LogisticsEntry = {
  name: string;
  // Older notes use detail. Newer stay notes use text. Either may be set.
  detail?: string;
  text?: string;
  phones?: string[];
  links?: LogisticsLink[];
  serviceData?: LogisticsJourney;
  endOfServiceData?: LogisticsJourney;
};

export type LogisticsSection = {
  id: string;
  title: string;
  intro?: string;
  entries: LogisticsEntry[];
};

export type Wedding = {
  couple: { first: string; second: string };
  dateLabel: string;
  events: WeddingEvent[];
  timeline: TimelineItem[];
  logistics: LogisticsSection[];
};

/**
 * Wedding copy. Leave a string empty to show "To be confirmed".
 * Party invitations only receive events whose visibleTo includes "party".
 */
export const wedding: Wedding = {
  couple: {
    first: "Maisie",
    second: "Aidan",
  },
  dateLabel: "22nd May 2027",

  // Church, reception, and the evening party. Each event carries its own dress and travel notes.
  events: [
    {
      id: "service",
      title: "Church service",
      visibleTo: ["full"],
      time: "1300",
      venue: "St Disens Church",
      address: "6 Church Street, Bradninch, Exeter, EX5 4NS, England, UK, Earth, Solar System, Milky Way, Universe",
      dress: "Colourful wedding attire",
      militaryDress: "Military guests are encouraged to wear uniform, No. 1B Lovat Dress with Sam Browne, sword and gloves or service equivalent.",
      travel: "Parking is limited in Bradninch. We recommend taking the 1A Bus from Exeter/Tiverton or booking a taxi in advance.",
      notes: "",
    },
    {
      id: "reception",
      title: "Reception",
      visibleTo: ["full"],
      time: "circa 1530",
      venue: "Officers Mess",
      address: "Officers Mess, Commando Training Centre Royal Marines, Lympstone, EXMOUTH, EX8 5AR",
      dress: "",
      militaryDress: "Relax to Mess undress or service ",
      travel: "Transport will be arranged from the church in Bradninch to the Reception at the Officers' Mess.",
      notes: "There will be a drinks reception followed by a wedding breakfast. You will need ID to get onto CTCRM.",
    },
    {
      id: "party",
      title: "Evening party",
      visibleTo: ["full", "party"],
      time: "1900 to 2359",
      venue: "Officers Mess",
      address: "Officers Mess, Commando Training Centre Royal Marines, Lympstone, EXMOUTH, EX8 5AR",
      dress: "",
      travel: "Please organise your own transport from the evening party. There is a train station Lympstone Commando a 5 min walk from the officers mess and has links to Exeter and Exmouth.",
      notes: "Please remember to bring your ID to get onto CTCRM.",
    },
  ],

  // Shown in The day, in order, and only when that event is on the invitation.
  timeline: [
    {
      id: "service",
      eventId: "service",
      time: "1300",
      title: "Church service",
      detail: "The marriage ceremony.",
    },
    {
      id: "reception",
      eventId: "reception",
      time: "1530",
      title: "Reception",
      detail: "A drinks reception followed by a wedding breakfast in the Officers Mess.",
    },
    {
      id: "party",
      eventId: "party",
      time: "1900",
      title: "Evening party",
      detail: "Drinks and dancing in the mess.",
    },
  ],

  // Practical notes for getting to the day. Edit the copy here.
  // Train times below are the published Saturday pattern until December 2026.
  logistics: [
    {
      id: "stay",
      title: "Where to stay",
      intro:
        "If you are coming to the service, staying in Exeter will be the simplest option since there is a direct bus to Bradninch.",
      entries: [
        {
          name: "Officers Mess",
          detail: "There should be a number of rooms available at the officers mess, if you wish to stay on camp please add this to your RSVP notes or get in touch with us.",
          serviceData: {
            text: "Travel to Bradninch is quickest by taxi but can be done on public transport.",
            publicTransport: "Stagecoach 57 to Exeter Bus Station then 1A",
            publicTransportTime: "Just over an hour",
            publicTransportCost: "£6"
          }
        },
        {
          name: "Exeter",
          text: "Exeter will be the easiest place to stay. There is a direct bus to Bradninch from the bus station, you can also easily get the train back to Exeter from CTCRM at the end of the night.",
          links: [
            { label: "More places in Exeter", href: "https://www.visitexeter.com/places-to-stay" },
          ],
          serviceData: {
            text: "Travel to Bradninch is quickest by taxi but can be done on public transport.",
            publicTransport: "1A from Exeter Bus station",
            publicTransportTime: "30 mins",
            publicTransportCost: "£3"
          },
          endOfServiceData: {
            text: "On completion of the evening's festivities, catch the last train from CTCRM at 00:24",
            publicTransport: "00:24 train to Exeter Central from Lympstone Commando",
            publicTransportTime: "22 mins",
            publicTransportCost: "Somewhere in the region of £5"
          }
        },
        {
          name: "Exmouth",
          text: "Exmouth is another good option, though expect slightly longer travel times to Bradninch if you are attending the service...",
          links: [
            { label: "More places in Exmouth", href: "https://www.visitexmouth.co.uk/stay" },
          ],
          serviceData: {
            text: "Travel to Bradninch is quickest by taxi but can be done on public transport.",
            publicTransport: "Stagecoach 57 to Exeter Bus Station then 1A",
            publicTransportTime: "1 hour 30 mins",
            publicTransportCost: "£6"
          },
          endOfServiceData: {
            text: "The last train is at 23:46 otherwise a short journey by taxi will get you to bed.",
            publicTransport: "23:46 train to Exmouth from Lympstone Commando",
            publicTransportTime: "9 mins",
            publicTransportCost: "Not a lot"
          }
        }
      ],
    },
    {
      id: "taxis",
      title: "Taxis and private hire",
      intro:
        "There are a number of taxi companies in the area you can also get an Uber.",
      entries: [
        {
          name: "Apple Taxis, Exeter",
          detail:
            "Open around the clock, with a desk at Exeter St Davids and cars at Exeter Airport. A good booking for the church, the airport, and a pre-booked car home.",
          links: [{ label: "Website", href: "https://www.appletaxisexeter.co.uk/" }],
        },
        {
          name: "River Cabs, Exmouth",
          detail:
            "Covers Exmouth, Lympstone, and the camp. Cars take up to four passengers. Airport journeys need at least a day's notice.",
          links: [{ label: "Website", href: "https://rivercabs.co.uk/" }],
        },
      ],
    },
    {
      id: "buses",
      title: "Buses",
      entries: [
        {
          name: "Route 1A",
          detail: "This route goes from Exeter Bus Station to Bradninch every hour.",
        },
        {
          name: "Route 57",
          detail: "This route goes from Exmouth to Exeter Bus Station every 20 minutes.",
        }
      ]
    }
  ],
};
