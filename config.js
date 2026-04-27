const SITE = {
  meta: {
    siteTitle: "Ігнатьєв Віталій",
    ownerName: "Віталій Ігнатьєв",
    year: "2026",
    homeTitle: "Ігнатьєв Віталій",
    homeSubtitle: "ісихаст, викладач, священнослужитель"
  },
  menu: {
    home: "Головна",
    downloads: "Завантаження",
    contact: "Зв'язок"
  },
  home: {
    aboutHeading: "Про мене",
    aboutImage: {
      src: "files/media/about-me-photo.jpg",
      alt: "Фото Віталія Ігнатьєва"
    },
    aboutParagraphs: [
      "Закінчив філософський факультет Київського державного університету імені Тараса Шевченка і отримав кваліфікацію спеціаліста за спеціальністю «філософ, викладач філософських дисциплін».",
      "У 2010 р. в Інституті вищої освіти АПН України захистив кандидатську дисертацію на тему: «Націософія в дискурсі філософських парадигм».",
      "У 2013 р. присвоєно вчене звання доцента кафедри суспільно-політичних наук, глобалістики та соціальних комунікацій.",
      "У 2023-2025 рр – навчався в докторантурі РДГУ за спеціальністю «Релінієзнавство»."
    ],
    activitiesHeading: "Моя діяльність"
  },
  activities: {
    1: {
      name: "Наукова активність",
      cardDescription: "Дослідження з питань некласичної філософії та філософії релігії",
      pageDescription: [
        "Дослідження з питань некласичної філософії та філософії релігії"
      ],
      heroImage: {
        src: "files/media/activity1-photo1.jpg",
        alt: "Фото для сторінки наукової активності"
      },
      gallery: [
        {
          src: "files/media/activity1-photo1.jpg",
          alt: "Фото 1 для наукової активності"
        },
        {
          src: "files/media/activity1-photo2.jpg",
          alt: "Фото 2 для наукової активності"
        }
      ],
      videos: [
        {
          title: "YouTube video 1",
          embed: "https://www.youtube.com/embed/VIDEO_ID"
        },
        {
          title: "YouTube video 2",
          embed: "https://www.youtube.com/embed/VIDEO_ID"
        }
      ]
    },
    2: {
      name: "Освітня діяльність",
      cardDescription: "Викладач філософії в Донецькому національному медичному університеті у м. Кропивницький",
      pageDescription: [
        "Викладач філософії в Донецькому національному медичному університеті у м. Кропивницький"
      ],
      heroImage: {
        src: "files/media/activity2-photo1.jpg",
        alt: "Фото для сторінки освітньої діяльності"
      },
      gallery: [
        {
          src: "files/media/activity2-photo1.jpg",
          alt: "Фото 1 для освітньої діяльності"
        },
        {
          src: "files/media/activity2-photo2.jpg",
          alt: "Фото 2 для освітньої діяльності"
        }
      ],
      videos: [
        {
          title: "YouTube video 1",
          embed: "https://www.youtube.com/embed/VIDEO_ID"
        },
        {
          title: "YouTube video 2",
          embed: "https://www.youtube.com/embed/VIDEO_ID"
        }
      ]
    },
    3: {
      name: "Священнослужіння",
      cardDescription: "Священник, протоієрей Свято-Покровського Храму у м. Кропивницький",
      pageDescription: [
        "Священник, протоієрей Свято-Покровського Храму у м. Кропивницький"
      ],
      heroImage: {
        src: "files/media/activity3-photo1.jpg",
        alt: "Фото для сторінки священнослужіння"
      },
      gallery: [
        {
          src: "files/media/activity3-photo1.jpg",
          alt: "Фото 1 для священнослужіння"
        },
        {
          src: "files/media/activity3-photo2.jpg",
          alt: "Фото 2 для священнослужіння"
        }
      ],
      videos: [
        {
          title: "YouTube video 1",
          embed: "https://www.youtube.com/embed/VIDEO_ID"
        },
        {
          title: "YouTube video 2",
          embed: "https://www.youtube.com/embed/VIDEO_ID"
        }
      ]
    }
  },
  downloads: {
    pageTitle: "Завантаження",
    heading: "Матеріали для завантаження",
    intro: "Тут можна розміщувати книги, уривки, PDF або DOCX-файли.",
    files: [
      {
        href: "files/example.pdf",
        label: "Книга — приклад PDF"
      },
      {
        href: "files/sample-chapter.docx",
        label: "Уривок — приклад DOCX"
      }
    ]
  },
  contact: {
    pageTitle: "Зв'язок",
    heading: "Зворотний зв'язок",
    intro: "Для роботи форми потрібно створити форму на Formspree і замінити your-form-id у посиланні нижче.",
    formAction: "https://formspree.io/f/your-form-id",
    fields: {
      name: "Ім'я",
      email: "Email",
      message: "Повідомлення",
      submit: "Надіслати"
    }
  }
};
