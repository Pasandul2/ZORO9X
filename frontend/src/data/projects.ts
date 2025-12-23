export interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  link: string;
  technologies?: string[];
  github?: string;
}

export const projects: Project[] = [
  {
    id: 1,
    title: "Hotel Booking Website",
    description: "Responsive design for a Hotel",
    image: "/uploads/portfolio/projects3.png",
    link: "https://bolagalanatureresort.com/",
    technologies: ["React", "Node.js", "MongoDB"]
  },
  {
    id: 2,
    title: "Salon Booking Website",
    description: "Responsive Web Page for a Salon",
    image: "/uploads/portfolio/projects5.png",
    link: "https://salonkaveesha.com/",
    technologies: ["React", "TypeScript", "Tailwind CSS"]
  },
  {
    id: 3,
    title: "Business Website",
    description: "Responsive design for a Business Company",
    image: "/uploads/portfolio/projects1.png",
    link: "https://smarttradingasia.com/",
    technologies: ["Next.js", "React", "CSS"]
  },
  {
    id: 4,
    title: "Business Website",
    description: "Clean design for a Business Company",
    image: "/uploads/portfolio/projects2.png",
    link: "https://silvaaccessorieslanka.com/",
    technologies: ["HTML", "CSS", "JavaScript"]
  },
  {
    id: 5,
    title: "Wedding Planning Platform",
    description: "A Website for wedding planning and management",
    image: "/uploads/portfolio/projects4.png",
    link: "https://royalweddings.lk/",
    technologies: ["React", "Express", "MySQL"]
  },
  {
    id: 6,
    title: "Hotel Booking Website",
    description: "Responsive design for a Hotel",
    image: "/uploads/portfolio/projects3.png",
    link: "https://bolagalanatureresort.com/",
    technologies: ["React", "Node.js", "MongoDB"]
  },
  {
    id: 7,
    title: "Salon Booking Website",
    description: "Responsive Web Page for a Salon",
    image: "/uploads/portfolio/projects5.png",
    link: "https://salonkaveesha.com/",
    technologies: ["React", "TypeScript", "Tailwind CSS"]
  }
];
