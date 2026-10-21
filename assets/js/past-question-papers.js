(() => {
  const app = document.querySelector('#papers-app');
  const filtersForm = document.querySelector('#papers-filters');
  const results = document.querySelector('#papers-results');
  const resultCount = document.querySelector('#papers-result-count');
  const notice = document.querySelector('#papers-access-notice');
  if (!app || !filtersForm || !results || !resultCount) return;

  const controls = {
    year: filtersForm.elements.year,
    examination: filtersForm.elements.examination,
    class: filtersForm.elements.class,
    subject: filtersForm.elements.subject,
  };
  const subjectAliases = {
    DTI: 'DTI',
    ICT: 'DTI',
    'Design Technology and Innovation (DTI)': 'DTI',
    'Digital Technology and Information': 'DTI',
  };
  const initialInstructions = 'Choose one or more filters and click Search Papers. Entries without confirmed access remain listed with a status message.';
  const unverifiedExplanation = 'This paper is listed in the catalogue, but its document has not yet been confirmed as accessible to students. Please check again later.';
  const isQuestionPaperCandidate = (paper) => paper?.resourceType === 'question-paper-candidate';
  // Allowlisted IDs have evidence of signed-out access: prior viewer checks or unauthenticated PDF retrieval, as detailed in papers-access-audit.md.
  const signedOutVerifiedDriveFileIds = new Set([
  // Existing IDs confirmed in signed-out Chrome Incognito, with PDF contents displayed.
    '1U3IcbJHBucy7rU_kfDuydbGzkuBAVbU4',
    '1_ZBxgDnsEwCys93i5ZwWRud0aQDR1RYV',
    '1uTkAwJh0I-kWuNboXB49nU8atwnBOUCw',
    '17H_jdHB2SoyqrHXstLhOeKr1tSI4Kt8f',
    '17pOdUC4jiqRzJH_jczd4Pg4Y6uIPNGIO',
    '1Svh5bUT3M-pu2TlWszMB6fTY5xlTZEN-',
    '1_MCkiMEJJSLhxhzUYEIiYARg8LBYNMTr',
    '1Q90Gdgy7ZHm4palPZSpFwVs7vu3NFQIH',
    '1WwApTRp-ljjUL2w6j6WWj9pM7YUtv2IN',
    '1sfn7JtPwfDZy-wTV4KzOIxxBJt43wenI',
    '1EiqEB6DDXQgQdCiXnMv58lGgnFl_ZUBR',
    '1jtMa4O5x10ItQniomXo-U5rpWyL8Jy_j',
    '1cVpWgWJI4vMAzMY3cR2vQfTwaF6zTJwa',
    '1Obnj3NGmb4m9Gw16E6su31mqLw3lFYSb',
    '1hw1alDelJ1bSIppseaZ7O19C-u00Eb_E',
    '1ZDrCEUJ8mz7GYv2_qBPbN6ULnElykCOV',
    '1m_CRlBNG2ulRWv_VkK3ctFCZxWOXEiD5',
    '1hQ3Uaqnr-QwZvX94eKvDS_o3NR6jNPSU',
    '1arSWazG4G0ly9BqNaADtv6Z2o7FHxQ4D',
    '1yqwf0JoJel5tNf9aELKDuwOYJElEdaZ8',
    '1lDMp_rqaTDlFEN_O5Q9HTdjbsfenI8Ky',
    '1hdG0dsk9gWGKd0dkfTNXGWtxHCM_l4Eo',
    '1GRRV2kp-lliMg9jydM26zglx2FeXTU-0',
    '15JZ3ZEdbGUjcYmWym1rKSTiHJ87gZkmw',
    '1mz1F8iQRrmuJkwIYFLoG9MCLo-YOVw4r',
    '1IV34Ew3K4hkwSefUcPU6Y30za2mYLodo',
  // Additional IDs whose actual PDF bytes were retrieved without cookies or credentials in the access audit.
    '1QibEEI0b8n3gxTp_KwfY3oO4YhTiRg3o',
    '1Ipsq7d3PN5QL0d8uaEH8gsvDbl_PUW-j',
    '1dTml5QQtbcgtPFLsITrg1XdIpzfbUBJO',
    '18JYe8xHIIAVntM3cQi6R3gl_9lS_1qwi',
    '11kyz5pkn3ZIul48mgt7VnE3NszA6iSKW',
    '1YAMQtmOT77nlNFHMyl3KXotznZN8MnFo',
    '1HvnI8vPD1nmzwhQ8mhQ5e-LEhYVsK02H',
    '1PbrPGMUx4oEDfYmzKNwCEf4RZvYxJVTH',
    '1OaXSaZMfVO73YHqcMS_AlewjqFKrdyzy',
    '1aLs7dkE2ICY7DmQmYKMABtT7qkP9DxIg',
    '1i6DbpedXYvt97yR7ddzq4G7EYDkOND1w',
    '1eS7AjmYMot8zjMlC5i3Z8O2GXg9tpioK',
    '1MizP6wYqsNNH1VAOBkRS9KRUNoxxk9h1',
    '1xxy0DSMLaGfgyrpRd9VIctCHLpSI567P',
    '1obh-vBa0jdRNqgpMVmQNGSUNBrrEzaho',
    '107XL03NIbN--TNXHRD_XUmty8QIA6AnL',
    '1i2rf08cTA9hezuxElRxY1yb2c00Q0USh',
    '1Bz5aceKYHlfoN-9UycUap89oVoO_FUCO',
    '1NDcwaNPBc6IhjFlwMr6gpTaeIIq26rzt',
    '1Ze74p5NKCoauRMKlgsMT9tDYSZ6EOclQ',
    '1TdXsRMYQlY_X5Ex4YYY9JIhfUZDLroHL',
    '1YHoPe0Rca0z-aAMvjqPksT2uZ-HZBmlG',
    '1UWNIjNaVXrTaHVgqiJraDFGtdUIwZynH',
    '1JNCGouIHSS9DHi55SlnrwgmpS5IqP1w6',
    '1tbl4SUmbKlNu2nal2X2xkKIlmqfcew4o',
    '1696RWGUzX7EBk8QoqLhwTVf9oBWTiMgO',
    '1WUHYf_EnLEF_5bmswTiJvhnj3Vx-GZ7V',
    '13uOiZA6huehzU8hC3vfw5z02fxjp_p8V',
    '1I1E9NNpGr9Dh81x9Rp2y5IXyYRGg_rlB',
    '1wJ40Czm991G69poD-WI9DTtvQvLf38Bp',
    '1j_NZa5Y5RDuZCov4JkAlOsn74c899yaA',
    '1SoWuQcy9r_Hmm0rYih6kgBdOrUo_-4Vv',
    '1WnJYwJYjOeIPtzVYG-vc9NaXta0GiIC-',
    '16k2FSsxx0F8xpA6kzTsZgKniSrmUI-qg',
    '1plUJhWu5nYY-xwg29gt6iQ2g3p7VBr48',
    '1LqlLQgwGSTiUhh7p0KSLGEfihD-D36Sn',
    '1mtr6hqgusS-oP7Og_2L1CIZb47Kdymnb',
    '1oautKxPcyAKktMd5AW5lCfYG-JIhWM09',
    '1PF7DlhXsZrg9U0O_60ysNQvV1NW92c-j',
    '1AhRU-s-kHkkKp9utEEaVTQycSHpiPeCI',
    '1a8Pox80XqPrDS0Hfqggzp87N0l_N4w-I',
    '1Co7KZZLuRbh98VSnEKeuOXaKBANhOCz6',
    '1ghgbjRLiyBsSg0A9cMXyBA8gHOLTg3Hl',
    '10FdI_j8Z85yCGmCHCK4hMpKl1D2CersW',
    '1IkkV7sfygH_3Jy1AziIAj-7iXxXTQMmU',
    '1PqepgxgH1JKagrR5T061MM-Xz4C7nZ7r',
    '1Eq9lDl9u6ZXtjCTLKPOX75rFWuJGB_Al',
    '1Xz6inAKPEwjjqXXpQZwsDVUQoi4K852y',
    '1Ft_JEUsPg41a_OO7q_NEQYc74hBYr0Q-',
    '11K3mK0k7XfkEmJw1jl_gweKFRoKjzEpI',
    '1i8zlzdQuQ-t4a0XDUeQ6t90gOhumYlwc',
    '1CDcl_iLC44KVgVy1d5TCpt7Gv9nh-gY7',
    '1FSfRxaa2PdZ3PeAqM-qk7xQEeqAzv4_U',
    '1NvQSVF9vaG53-XAvjUWy_2zASQCbOUNJ',
    '1Gwonuq6YL4UUw8iv718CFNsCXqGOGu6e',
    '1OlUuo-nihG3NgP0iQYvLBV6hm4rcBsMz',
    '1N_-2GaM1-bvBkjp8TnCFC8aZtM3ATaCZ',
    '1yMrH3qUNJPQow-lQDj45-yilTO-cEXqV',
    '1bYOhk8hDfGC5uQrK1_xWOwTmLI7S8o0B',
    '1j8uxyoMo8LTA8CseLGq2_AD3PgSs7KrJ',
    '1jiFxDbWEbdsiVPnPmJxkczBSctSc1V_3',
    '1Dg9rAS7TCG6pEoWJ-ngfi4-Hq350sVYK',
    '1YsKPiKELCoul_vBACsxWsN4QXBnKhMrP',
    '1MsrgSFFBxu17t-4GQmkQqGcYXf1jYFmC',
    '1Ams7Xd4Rmrf1uvDUoCp5qoBHmMl-NBYA',
    '1LhRFlYPJkI6PHqgQBx-OexLbgehYSpf2',
    '1uyPwN_H0hrBUID1ZDEhb7cg-Kv3NkAid',
    '1YzhplcOTMkRCJrjLcdQLj2-z4e8LdPBp',
    '15vfJMvpSN6GrOi2bDm9-kmKHFxsONAJg',
    '1hDjrPRDxpLHHkBuPrU0XFKA0_gPfM2Gk',
    '1Oxmqc_I_AxV3eVB6hX5-GYLkElsRgLcV',
    '1qigkTYX6AZRSbjXMOB8gxnrPGxA-vwmp',
    '1VIuGTegJFaY_eB2eN1r7NWPoFAtwB1Lw',
    '1sszzyQ_WgCCGYlR6msEr8EsgzFLeTfSi',
    '14DleUeCNJFkwC2hPJfe_BuHzB5Ie0R4B',
    '1AY6mpt2_1R33CfDhAmp-YiLnc6r0P4Do',
    '1NYKoTSL31CDJIx2R6yLHiGkHHWRDzwNv',
    '1UrAWwwhi-NQmuAPiC5pB_S2NtVVJy6Oy',
    '1vO7i2gLi8LccOWQqfaNBccfjM_lymqIl',
    '1TKUFFfks1yhklU024dDc2a4O1U5zKQRB',
    '1i3LrH5Tl9p0IxbqvLzAJyJxkCaep3snx',
    '1grnVoFNxpB_nJZ27Bg7EoGL-kiAQZUnm',
    '1mWs0gS02kyBsaSy18sQI-n6J1XljyWC3',
    '1GWBUQnNy5TIuS-wGs7ptU0YulQhKv-4-',
    '16UPdf0i56lmJt_fP6VbCzgJvqLRBLyhZ',
    '1Qi0yvF1PyTCqZkm2u3qdqSkspwO1bPmu',
    '1x0nSbUaOl0QkAkXCugCytPYTyu8KAX-B',
    '14PGltMy4eK6mmobGfdfx_aDEAD0a-ZEh',
    '1RlS1ARAuVN3HY4UmErtQuuNl5m85NblU',
    '1i5NCfQMW7pp5bBsHovCFUDzeGdDOz-Vo',
    '1DiTIUk3z2N830VtGKnsY-VXuNSWreSZr',
    '1qGCvhOhtW7HRwIoUf7Ky-5-YkCHQnsRw',
    '1KE8JLdbrXdVJQvPxwhNxhi7iVFmfTolF',
    '1MmBSeVTphZ9P41aDsspU6v9p0z4_nZJf',
    '1PlgBkcAmkzrasbkCdIHAofu_Rvj4i5P8',
    '1WxcASeJmXAgE0zjdTz8kFh0mlvaZMAMY',
    '141V3vmnppwYYVcOtxKFWJ-mU80JEDCQ7',
    '1Ak6QfKq1GHBad45m0xr2QgkN5frtwPMv',
    '1qKfZ2CEfkG9XgsKV7_lh0cRKqp96nonp',
    '1dsFwrHWr0SlOY7Xbu0ELT0Tcezz32znu',
    '1e14jChIXsNdDoBZsaE3Ff94xbSLSI9_Z',
    '1r6w06SkKoyzG-NJuIuJFeJLO0H3k3g-y',
    '1QNrArjYYIXu28vQ05ug3L9RrlI_XcPEV',
    '1Z23eXkSN5uMVVQdrXrygBtr6sepOwZqw',
    '1zWWkfbJku8ktAh-HwfNiLqEYTbESJIxN',
    '1oaK3bJT3hMAzdbXRqZJ85_ZcIrSvfLK3',
    '1tW8Lt7qBX9rDQU9gH6086MCD5hkK81I3',
    '1VdGF1dS-6Iy1AcbhbH9cqT0QoAaT-TE5',
    '148T9sXvXis3IkC0SKkDVQEZyr0uSINsR',
    '1d9q9fHVpr-1mSl8broC4Y3V9e2cQG4AH',
    '1NXpi7CXyJJZNrAxDaT8xrD86VgO6lMQP',
    '10rUEdrIhnu-SbFw_KIVxJxDR_1f2Ir0U',
    '1TU8jyXnGwUzCmGQY0rYTdKzQHMflWp1w',
    '1bpX9WlLxqciit4HwRFFA8x8C-oDFYG8s',
    '1NrBHI6ag2czbfqxqC98P7VrLJeiExaDu',
    '1sYMV7bpan48qjWC740Ss1vDU7LCmhwcf',
    '1ZRLEgtsmzazedWRtJpfUfwmkJmlRK20M',
    '1ImBQxswWEjXiitXFMCVwHXODkoOyCBg4',
    '1DSn_vjaC6Ao4YHWrSgzquVAnbpQSn3vM',
    '1WLIlc6d8iJ88VmgfwQ8QpE3YJk-4PK9e',
    '1AFjHXQdK83Uf6SBd39QzJ-KoxMJThsnh',
    '1MHnDUjL2cJOHyWhdteHTC28rSko-B4zk',
    '1iGsIOnrfMGLc6fAlZcx7dKss2HsehQ-K',
    '1vx0oNCoyonMqiHlZBpewuFiM8cNpx7fr',
    '14BOH7GCHkV7koualKuir8CVRLuBDSu_g',
    '1hEwuxBF8z9akplps39_LoilZFmfMrsTY',
    '1nnuNRQl8tHliMnYPDdwWmf0aJYgfL82D',
    '1EdbVmG09q22XIHSxyOX4xAsUqo7g8iY1',
    '1aVskaVyxG55eRv4BgYXwkIlJaTcj9thV',
    '1N735LSvc3YfCh6q4MV8ZaEtTe313GjQ_',
    '1bnOHCdr9Aj5tItqgQVi0pYGh04T2cbNG',
    '1wo108p-508mAW1vGJw-HkilkMgDvNwXB',
    '1mqhLs85A17HM7RY_ki_QpV9LsTdkZgNx',
    '1Z8wwbtweHMa2A8vO-Res3jwPB3n6m4u_',
    '1AawUeTAqf_7VeK6aRpPNDLiIUUqu6l1_',
    '1ccJ7d0xeypLJRABeiyAVybo6mjRzYGIZ',
    '1XlwaHu97eHuE3nFuHuFJ8lSCXGce5mkD',
    '15-veO9lsyV5oRPeKfkvXZtXyhEMHT1e8',
    '1Ey8jOAjW-uArARlbG1-55C4Eyw7f7bnp',
    '1mcoyoMYB-TRDcaRSYLSITt2QlnKn7b2X',
    '1VdT2bQ5coAHBpYZw5FgiEWfpw6w1V5nq',
    '16O0zo0SMFtK_3Plc7j4-5voNBqj04iMB',
    '1H8M9S7mbu4pVzzVG2HQVg-WK4mLD6pPr',
    '15Nn5hCAtF56_R5XPJRTC6s2zfA8nOpJA',
    '1K-UKlMWKibkG6xKjG8JxtvxS4fSSMN-H',
    '1LEmlbsZB91BAHQIa82PHGtTiAAd23nG5',
    '1mFE2NsCYCR39Y-2X76dVTe2QQcQo8B9-',
    '1fVoMcydJ2R5btaUDYIzNA5weGFLbRrrT',
    '1FewOrTNEOpJUsaOixOui_cm0tQX0At7L',
    '11QDVPrWLVxUylBc0gMxP9E4MhkFdFzEZ',
    '1B58bypekQqlVI-gC_07bDCAOAVHHaRcy',
    '1z2a4y3Ys-K_xMXPCK-QjEBd08hfUr0cT',
    '1kYTC-qaIpz3mNuN1Z0MN5YpaRmy6rBfO',
    '1BmRfrlwwJEl1hOVuRTdIM2XkLNgYsQ0C',
    '1n-d0LCwaF0U2HlKRsKN_BReOOBsegGpr',
    '1nHdQQ4FFzwUBp0jJFFObP6d-K2j0bckC',
    '1TWdgxN8t9Gs-wbDDd3XT1iUw9UK4_7lp',
    '1b9_NrVFRnroq0eCNviGetMPnyOjwLoP1',
    '1OtQ77L3b3K4SdZw-wvpJ-GIQzOIxWvBJ',
    '1LuhKjYfRp6FewmaGmm2K1uQ3FS4jQZXq',
    '1ukyj6zcuVWSJCr-QaTuZbAh-Ymc0HZPP',
    '1ei4_nR4h2XDw1kaDt91bP1H23qF1-NaM',
    '1nbWrCl8It7NjXPB_nOVSNofBWmnuTqlS',
    '1qG991VKJELXLPCWXtym60pbppEucZeEy',
    '1l56bAcohEjMGm5mVz-P4j0UFdpZKb00N',
    '1KHoWAS6xltz50oUUZlQ2VG4NlJvA6brP',
    '17uQ7dP_0Bg6nt1-thI4dw_8xoKtFgrsH',
    '1jcva4Pdt0H1PJWXHvH5MTM7QhzJo0v35',
    '1ThuZJdGVxkO8H722YcZ-aI9ymphSVive',
    '1WxNuo6D9IslTNU6ES1vlnX0ZXYPXxmnG',
    '1hDgTneWpoYxsUKZMEyH166VLALUzPxHw',
    '1k714vIdIBiSVqkCW-yTEaawxpVMVmkrW',
    '1NGLs3zRKceeXZs4rghSv7p3R2KMPUdkK',
    '1qfN1emK0yHfx34q4zjTxRI0P-NPc5XRt',
    '1VpHPscJX_UO_Cxsfei_wArEiScW84uHw',
    '1E1yubWjEAxEayodiDSMf1tx5g3GG3VCt',
    '1kOnn4wUJy2e8KyGPuo4Nc0Ld678vCg3e',
    '1uxw6-cM06J-bLhybSb0Va6PturRcFuWT',
    '1cODP46rXbrUZH8NHrPppbkn0U9caD8LL',
    '1CtV0IUT7NlaE_pI-o4Acw6sMrOyGWioG',
    '1x-77xa3g1Gzv7fgLnB3fUbDIJMdHqszJ',
    '1qSod0N17LClEZ6J9EL9M0xfjZoEcDmH3',
    '1n4ZUIUaGxu0U8el8hd-YRlZPy_XfRNU8',
    '1oRCITGOR7cLO2otbJhhUCMlTBaaGp7gr',
    '1YDgPg1F3Eh3ymdpsFJsBM9wGNymd9uUk',
    '1LDci1HbvE48Ah3OKHXz4Efc0P5NI3SrM',
    '1NjK3-ZC2x2PW_7JonQDnCjrCURu9JTQF',
    '104kxzFvv9N52HjlLFUBkGFVyaDx7dotx',
    '1yX5lSiCF5-RCrA845XxgYV_19iU5p5DV',
    '18u_ULhqVXerOF0-OvGIMNCPFNL3tdp0a',
    '1l0C56vLU1pOL3Np8jDkXj7f_3ibE13zp',
    '15XXKw-RS4EPy2T2KOmmTpzigdXOEgW7f',
    '1Jmdg-3kRdSKZ0srENFoXk7Q_563UTGVT',
    '1zwfHlZiLHbnJT-LrzJBxdcFo6_CpM0xx',
    '1pgyi8yAxUo7ve8XnuZrayqsniHo3WgCF',
    '1qOGCWIkdDShPFXkvWZdMbEH3v00uT5TT',
    '18L1KPqQm8TvUDt4bjK56p21mOjmyOPyJ',
    '1E48ir1lnEMtq2Gh_GryiKEVqhtuibSB_',
    '1keEGTVxo3JTlIXOY3nm557U-I59Dviwb',
    '1ivzZqOX_RZZDZT1EAdcwB0waiY5jQcsd',
    '1Sxm4UmEp-WiEr8wGMNAzFXNkEax4HmGP',
    '1-feFkrt3-zmMw-6CJYg2ITcnqx2l--nP',
    '1bzvxVlMPaZM9DmKRavUVGxXZfusBe1zn',
    '1ie9vXc39jqgytYVa8Gmtwd-QCC6EisHI',
    '1z5o5YxrNZXUVoWhJCE0nOd2WCR92dVXd',
    '1QUr9X4tDLDcAzMz-8a5sUwpvZJkNkgcX',
    '1Em1l4caTFYpWYVeq1HN2iUAGOhFya37U',
    '1LGDVArMXXhKa8-7UK9fEO4TBNhfs8xln',
    '1PwK9vlZCRP5G7Z9UTFRDz0kuQReJ1BLM',
    '1kr4IGp8zvODWaiL-xi38p9w-zHaPgSf_',
    '1HCX36HxLJzOpZAKwI0W8SCoVwB42Z-GI',
    '1xJVN6wk5VjaVZEgX-xjTYJUyDtaHGy5Y',
    '167c_DjZx-5p9HCcyEvqAKIMcj1yB7vwX',
    '1E35g7wDjWGnhYwqARhQEG9q1yaIwKfEq',
    '1wSw9G_6kFt1rmfG8r3UjtQlPav1v5f3v',
    '1FWR3_CMDgWPX4tyOL2ykxoL0QXAolOYm',
    '1X2LpoENmWOetjoReMUjoqbSlcqEDEA9H',
    '1sklBbH_ZiDnZ-lJvR1zqAtepFGP63ytQ',
    '1rcmk9sneK1Or76eOsVZaE-7iuPQx8prx',
    '154B6uRBZMxp-PuHc-3t90OpHlq6RWkYR',
    '1UmtLuwl8UPADa9CjMF2ajGHETMfLAcmU',
    '1obziP45FPQ-elPvgkqtE2PdpL-dqChTq',
    '1FHQ8znP_lbIIafF2W5RWq7tEqe6VDys7',
    '1v9IGESPu6AfAHF0a9W0ZTcdcBJCu-fhf',
    '1ehiDIHsXmP2NAUsv-NQ6eiCpfhRvvkm-',
    '1HVkRwoqxNN_-F6a5BL2B2iFHjH0wFaPc',
    '12o1VlOoUf5HpyKcb60jYUkbI68n66lTM',
    '1383b5FMF9h4cDrKHlMyTnsh1QiH3848F',
    '191Rc3LsAJfHGecJfex2acK1teODoxVDg',
    '1dDssLbTspQmoWntwpXs-W8PO-oZ-rG2F',
    '1Yl1iGjN-wmQd_YKWC0q6Q7aqiM0SU13R',
    '1RCETGt8ddR2uU3Hn7KCidfnYVjBfbawz',
    '1WjvfD1rggg7fRc1Fgw3uxy2UYNalrwEk',
    '1MDwYyviA7MWLHqlTAcu1JSijZ2hSjUiG',
    '1Dbpk-rhu2lavHynmJd9y0NGc_W5UKAlE',
    '1q6a8FK78iKx8xw9t06Sgdvg7hG-Y9q65',
    '1Diai4sx3sB8wIloTe1d3IUvoRBUxmvR_',
    '1RtS0FKjD4aBxH5aHmhJGMufopi3qolob',
    '1Jn2CYj6aaLcZ69rrr6jZSSlnQ9meAue8',
    '1OBta6XlKlCzLfvu2Tv-ObzoT2CGpxEna',
    '1ucc0-aEVznEet22FGsu4sc5vTCafBvtu',
    '1TYLzzzT09RI6T-fsyXMVtOxujOVG9sUw',
    '1K9YRABQ3JIvMH8q4Z0buHPic6yCcPQtG',
    '15wFUp7TTgZzG6Y121BfJmH6Ld6f4ecZW',
    '1IG8ruMh1zLIFfd_8AH0AKbtDyCYD2KzO',
    '1PJD-EhnELQZjSO-qX-0BclfOUaaQ1mtE',
    '1R0ZUIUQ691Y5FV7sPvYQoWykTggYM4YW',
    '14rG0U5EtGJ9z1HSu8YNxn4jtcW8TK5wG',
    '1sPketGq0YIlTSSE1xK0VemYKf85rq06u',
    '1ViboUKx9_hZ96trJtMzPexW3Ij-3lQ5F',
    '13ozbcNJN0ZsGAYVoCy3uFLOcyzCGfc4A',
    '1erTOxEgsKCrcJa3XMp4yj43CyMVCrPD1',
    '1NnKgqxXaTtiI8Ikgct80NyrVn1Pb5B1s',
    '1PDhK5H09Gah8226zl_VzJa_E02TjiMli',
    '1XZUOUt023e34dzryObL9o-a-svJ6z7JP',
    '1pF3dBOX9_n4v-wg13DmE1a-EKcWgdYSM',
    '1k7LERKq4rNiBNNYxKTUuqGzxL2tlCeja',
    '1EU1weHoF6meA2Tty0cMW8RBL-4O38XCJ',
    '1ujZE-OLoqceo7OUsjhsWFPr4k4zS1W8_',
    '1SV9nWvUNqttvoDqd6tSuoXA1T4kiCn_D',
    '1BeAENL3WEwxh6ZtGKrlt-35GmzH13H5B',
    '13cqRYBlEZFGuASwHNGKCaYngB7ikVIzg',
    '1Tv93vMfPQye7joYmoB5nG-1dyuVWtAjs',
    '1Djz8N1G_7Egkch4IgCDdCsSZXbNA_SWF',
    '1gayZ3mDfdkvZZDZB5fqmXQnDPsS8PqWw',
    '17d1r5lJ-BkJPOAqCi4n-MfmcEIxKjlgA',
    '1U8w8amcO99MdcSKJXBnqLvxFNk-rVj3l',
    '1g01GWBsmzfWlpafh6yLAcztFTPD8l45s',
    '1TYA86WQEz_T6OSoD0fMv1HPuaOpKzmKt',
    '1XhHZxLr-DuUhnoQfDUaFna8Ktlbqm0_n',
    '1jqTw9WHYMMTtY2JGvd5FJsKX_BRSYpEb',
    '1Zh1d72IFAL6yOePNhSlWAe4R7FMkjtQe',
    '1vRGgWSRDhat27MvEIVtWgY8cFdcu3_wc',
    '1nbiDvMjQH1hCdDYZE6ysJF2GME150Ujq',
    '1-n-orV1nrJ0D1-GAYjrDHFbyCXagtS5b',
    '1njNjjcj01NBHYY0wyeVjMCnX1h2xDpdq',
    '1-jMa0Vb0hyVCD8uiQbILGC0x87TJ0vSf',
    '1E5tc_31Rb7AilEYGOJzVskLQqmfs980-',
    '1GMmkoIM9JExE1S7EOimlkvz3v0DkAFij',
    '1z4ae5a4_7tPvJnU6b7FsCX2yjTqAB6PM',
    '1eaV0Knwytsvq7bTIFbLVdut_kKhs8s7U',
    '1TqaFPurRBsU65OF00pW_ey-tcgZY66HK',
    '1wkeWuZIFi-k_6BGk5KN1x88aLPI5qDuJ',
    '1OYj60VEkttRF85fzGlAIkbareQLqYFVu',
    '1IGrEO9NrDF9teM5OtoGAwnMzKalOm9vY',
    '1fw7peJkJ2R6-09i5hi4gOwk7Uk2UjMex',
    '1U7-qXRBpEtV9ThqED5aaeNP-6atenOwZ',
    '1H2nKRBVzuw-mGybIqcvHn64MvG7XYLZ-',
    '1efDPkgSBmvw2Jn_CSHWDhuym3ldypG0Z',
    '1j_Xj8_cpjHUtDcKSWBqH47SC9iZHd9-4',
    '1PWiKx1dsrkfEUKdky9T9xV-kDcqflprD',
    '1rIqxtyBTVDHVLazjR8z-5JPrnmIaFyvk',
    '1T6xtQleQnf82tqfVm2hmGWl3AC0w9LuJ',
    '1XIZ8EvlAmYYenXDHLHAmLK4I0yKIHSAI',
    '1rOp0ykY80GZa8RD-6008SRqtml_6uNtA',
    '1BpEvzHJ23okyt7OUMv9rw0Xy1COljBPf',
    '1BipM3I6j43JqEOPd1ylrflWoFsjAvBV4',
    '1g0Hf2EAsK7ixFOJ2OVNNzUBiqB8LTHWb',
    '1H3QZjOqkEAOE2c-HdqFPHcZyrn6B21eR',
    '1nmSGp-uGFo-YtiB0H8o2Zn5ftJtkupvy',
    '1-ec6JfaP79llSwYIe3ck6o2TQJPN2edg',
    '1Fdvjlg2MsEB42Oxvj98GPUBGUfjh2IjD',
    '1R9zm-TwcEvgiYEHQRfH8XHHOzSHP-ukI',
    '1iE4M3NGUaLJYEoR2CMjcLk9mc6VkiIDg',
    '1NbqE6cxa0JMUQJYfoteKiZWYtN0WAMo1',
    '1n1nLsL90TIHnexCA7JTdA7CKQaff36Ck',
    '1qpe6MrkdSzMON73Sx_sQdxNebjDJEfb7',
    '1Ph2fBlAyr7nawvI5YtfSvQ7ziKHzsKYI',
    '1teA8YnwlufyOSZS_QHRcACgPHrV_49Gu',
    '1-PXSKK2w6VCH-gVBCVD47i-f_VTBEQ8J',
    '1ZUaMDVBBRS9dcfVKIn9Ewsw1l0xjq001',
    '1NQO-a8Rx9MgEI8alrRuoxJcCbFDolxhj',
    '11TeBC92Wsf7KeaEkWr6QpmTLo1KpsT8r',
    '1fjXkvefmPQyufKb91v-Cfd_wuSPfCbUo',
    '1vmQBiQHEqKdSQT3Gg67fPRkLh_qDKk3E',
    '1CezK2XcmQ2h1AKr112JuPAKCTpcGhVrk',
    '1b1ZyI_gwb5DOhpMgp4LoqRCtD3plQJRv',
    '1T8Lwb6Cs8sRfykbHgMnOkJv-A8vtCUJO',
    '1EpokNOZRCnuAVKKnAxsOvv5TWNa5434o',
    '1mhKtKnedDuwsXqA2kOYxcNXuVwiCkGyA',
    '19pC9c5i8x53eOwaXXPpRmbNMoDodT7a0',
    '1mTSFyrT2H-dBwNQOMmKWEdgxrs1IBvtq',
    '12IhX5O7-B1RKfejQweJLT39U0LKFV-tZ',
    '1Y7uYY_nkadsxEUd75LxC8d0IGZbndisD',
    '1JenVPI4sojbA6bTqg9C-YRLMPGkXITae',
    '1IYIMi5KB1sV2hYXDZZ4ItJs9H0dCIcoa',
    '1pPPaDjJfvZ0hJQ_BQY8WZt4hXS4mNMpv',
    '19GlY8OQe_orVH9cywcRmts9PxLDFJhzq',
    '1s4A32_sfzOQVjHlyZFZ-ebkVJZ0mYpjw',
    '18MbFdPepyeFKtLkHWnqr1EaALxSJzHA9',
    '1o7aDe0MVrCQ-zfoaQA0J7uXnFnwFc-_c',
    '10zrht51wvxVoEXS9cMZ4IUHksWcoNFaW',
    '1m57mDYuyOq2UgX70fF_OxfYWdndHjzMt',
    '19CoHWuiF3xmRjQgysYuZeSxI4Et0tHLU',
    '1YsLLc_M1aoVO5ZLt2wlBWUyvjmm9EeSZ',
    '1UuaowIgUBhpSIfMYZVdCR0kcvQopAIK8',
    '1alK8p6XhW_cjPNcuqqS5QGehiDy8Oyhh',
    '1GWhqx6DFfF0cigSr0fomgu1L3cvK1k0m',
    '1U4sc6JBsxdYQutF-3I704OqAyFWZbr7F',
    '179BklK0PU3yK0arUNGJmbn9dXsB1Hs-g',
    '1wJMoAi1yd9OAcNpCRb3SqVwXfxQEGQPK',
    '12EMogXYbWxJF16vf1RhM4tVs6meONyeW',
    '1opAIDs7DpMvRc95T2smIVe9QUbltqv-j',
    '1DWi6Xi83b7GyLqTuVnBuDMzBcscRK-zX',
    '19ro0tq87O26msA1LwpLWYkW39omh-R8b',
    '1D6tDLuhZXIuZ-MJnqbVQPjGMr7_F-H2u',
    '14n2wzn36CBPVDnGWRug3Q8qxrhVa8Zi7',
    '15ybXjyzp37DZnX6-HrM4pCiWGWS0Cnej',
    '1neXa1jVUzpN8_LwJS4pNyUMHbBygkhpm',
]);;
  const hasVerifiedStudentAccess = (paper) =>
    paper?.accessVerificationStatus === 'verified-public' || signedOutVerifiedDriveFileIds.has(paper?.driveFileId);
  const validDriveId = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{20,60}$/.test(value);

  const buildViewerUrl = (paper) => {
    if (!paper || !validDriveId(paper.driveFileId)) return null;
    const id = encodeURIComponent(paper.driveFileId);
    const format = String(paper.fileFormat || '').toLowerCase();
    return format === 'pdf' ? `https://drive.google.com/file/d/${id}/view` : null;
  };

  const normalizeClass = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').replace(/^class\s+/i, '').toLocaleUpperCase();
  const classValues = (paper) => {
    const supplied = Array.isArray(paper.classes) ? paper.classes : [];
    const values = supplied.length ? supplied : (paper.class ? [paper.class] : []);
    return [...new Set(values.map(normalizeClass).filter(Boolean))];
  };

  const compareText = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  const romanNumber = (value) => {
    if (/^\d+$/.test(value)) return Number(value);
    if (!/^[IVXLCDM]+$/.test(value)) return null;
    const numerals = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    return [...value].reduce((total, numeral, index, characters) => {
      const current = numerals[numeral];
      const next = numerals[characters[index + 1]] || 0;
      return total + (current < next ? -current : current);
    }, 0);
  };
  const compareClasses = (a, b) => {
    const numberA = romanNumber(a);
    const numberB = romanNumber(b);
    return numberA !== null && numberB !== null ? numberA - numberB : compareText(a, b);
  };
  const canonicalSubject = (subject) => {
    const value = String(subject || '').trim().replace(/\s+/g, ' ');
    const alias = Object.entries(subjectAliases).find(([name]) => name.toLocaleLowerCase() === value.toLocaleLowerCase());
    return alias ? alias[1] : value;
  };
  const displaySubject = (subject) => canonicalSubject(subject);
  const normalizeFilterValue = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const normalizedOptions = (values) => {
    const unique = new Map();
    values.forEach((value) => {
      const label = String(value ?? '').trim().replace(/\s+/g, ' ');
      const key = normalizeFilterValue(label);
      if (key && !unique.has(key)) unique.set(key, label);
    });
    return new Set(unique.values());
  };
  const matchesFilters = (paper, selected) =>
    (!selected.year || normalizeFilterValue(paper.year) === normalizeFilterValue(selected.year)) &&
    (!selected.examination || normalizeFilterValue(paper.examinationType) === normalizeFilterValue(selected.examination)) &&
    (!selected.class || classValues(paper).includes(selected.class)) &&
    (!selected.subject || normalizeFilterValue(canonicalSubject(paper.subject)) === normalizeFilterValue(selected.subject));

  const fillSelect = (select, values, orderedValues = null, getLabel = (value) => value) => {
    const firstOption = select.options[0];
    select.replaceChildren(firstOption);
    const options = orderedValues
      ? orderedValues.filter((value) => values.has(value))
      : [...values].sort(compareText);
    options.forEach((value) => {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = String(getLabel(value));
      select.append(option);
    });
  };

  const selectedFilters = () => Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.value]));

  const examinationTitle = (value) => ({
    annual: 'Annual Examination',
    midterm: 'Midterm Examination',
    trial: 'Trial Examination',
    'quarterly i': 'Quarterly I Examination',
    'quarterly ii': 'Quarterly II Examination',
  }[normalizeFilterValue(value)] || String(value || '').trim().replace(/\s+/g, ' '));

  const buildDisplayTitle = (paper) => {
    const classList = classValues(paper);
    const classTitle = classList.length === 1
      ? `Class ${classList[0]}`
      : classList.length > 1
        ? `Classes ${classList.slice(0, -1).join(', ')} and ${classList.at(-1)}`
        : '';
    const subject = paper.subject ? displaySubject(paper.subject) : '';
    const identity = [classTitle, subject].filter(Boolean).join(' ');
    const exam = paper.examinationType ? examinationTitle(paper.examinationType) : '';
    const year = paper.year !== null && paper.year !== undefined && paper.year !== '' ? String(paper.year) : '';
    const context = [exam, year].filter(Boolean).join(' ');
    const availableParts = [classTitle, subject, exam, year].filter(Boolean).length;

    if (identity && availableParts >= 2) {
      return { text: [identity, context].filter(Boolean).join(' — '), generated: true };
    }
    return { text: paper.suggestedDisplayTitle || paper.originalFilename || 'Question paper', generated: false };
  };

  const makeCard = (paper) => {
    const verified = hasVerifiedStudentAccess(paper);
    const url = verified ? buildViewerUrl(paper) : null;
    const article = document.createElement('article');
    article.className = 'papers-card';
    const copy = document.createElement('div');
    copy.className = 'papers-card-copy';
    const displayTitle = buildDisplayTitle(paper);
    const title = document.createElement('h3');
    title.textContent = displayTitle.text;
    copy.append(title);
    const classList = classValues(paper);
    const items = displayTitle.generated ? [] : [
      paper.year,
      paper.examinationType,
      classList.length ? classList.map((value) => `Class ${value}`).join(', ') : null,
      paper.subject ? displaySubject(paper.subject) : null,
    ];
    const metadata = document.createElement('ul');
    metadata.className = 'papers-card-meta';
    metadata.setAttribute('aria-label', 'Paper details');
    items.filter((value) => value !== null && value !== undefined && value !== '').forEach((value) => {
      const item = document.createElement('li');
      item.textContent = String(value);
      metadata.append(item);
    });
    if (metadata.children.length) copy.append(metadata);
    if (url) {
      const link = document.createElement('a');
      link.className = 'papers-open-link';
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open Paper';
      link.setAttribute('aria-label', `Open ${title.textContent} in a new tab`);
      article.append(copy, link);
    } else {
      const status = document.createElement('div');
      status.className = 'papers-access-status';
      const statusTitle = document.createElement('strong');
      statusTitle.textContent = verified ? 'Verified access; link unavailable' : 'Access not verified';
      status.append(statusTitle);
      if (!verified) {
        const explanation = document.createElement('span');
        explanation.textContent = unverifiedExplanation;
        status.append(explanation);
      }
      article.append(copy, status);
    }
    return article;
  };

  const render = (candidates, selected) => {
    const candidateMatches = candidates.filter((paper) => matchesFilters(paper, selected));
    results.replaceChildren();
    const cards = candidateMatches.map(makeCard).filter(Boolean);
    cards.forEach((card) => results.append(card));

    if (cards.length) {
      resultCount.textContent = `${cards.length} matching ${cards.length === 1 ? 'paper' : 'papers'} found.`;
      return;
    }
    resultCount.textContent = 'No question papers found. Try changing your selections.';
  };

  const showError = (message) => {
    app.setAttribute('aria-busy', 'false');
    resultCount.textContent = 'The paper catalogue could not be loaded.';
    const error = document.createElement('p');
    error.className = 'papers-error';
    error.setAttribute('role', 'alert');
    error.textContent = message;
    results.replaceChildren(error);
    if (notice) notice.hidden = true;
  };

  const loadCatalogue = async () => {
    try {
      const response = await fetch('examination/data/papers-review.json', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
      const catalogue = await response.json();
      if (!catalogue || !Array.isArray(catalogue.papers)) throw new Error('The catalogue data is not in the expected format.');

      const candidates = catalogue.papers.filter(isQuestionPaperCandidate);
      fillSelect(controls.year, normalizedOptions(candidates.map((paper) => paper.year)));
      fillSelect(controls.examination, normalizedOptions(candidates.map((paper) => paper.examinationType)));
      const availableClasses = normalizedOptions(candidates.flatMap(classValues));
      fillSelect(controls.class, availableClasses, [...availableClasses].sort(compareClasses));
      const updateSubjects = () => {
        const previouslySelected = controls.subject.value;
        const selectedClass = controls.class.value;
        const subjects = normalizedOptions(candidates
          .filter((paper) => !selectedClass || classValues(paper).includes(selectedClass))
          .map((paper) => canonicalSubject(paper.subject))
          .filter(Boolean));
        fillSelect(controls.subject, subjects);
        const retainedSubject = [...subjects].find((subject) => normalizeFilterValue(subject) === normalizeFilterValue(previouslySelected));
        controls.subject.value = retainedSubject || '';
      };
      updateSubjects();

      let hasSearched = false;
      filtersForm.addEventListener('change', (event) => {
        if (event.target === controls.class) updateSubjects();
        if (hasSearched) {
          results.replaceChildren();
          resultCount.textContent = 'Your selections have changed. Click Search Papers to update the results.';
        }
      });
      filtersForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const selected = selectedFilters();
        if (!Object.values(selected).some(Boolean)) {
          hasSearched = false;
          resultCount.textContent = 'Select at least one filter, then click Search Papers to find question papers.';
          results.replaceChildren();
          return;
        }
        hasSearched = true;
        render(candidates, selected);
      });
      const clearButton = filtersForm.querySelector('[data-papers-clear]');
      clearButton?.addEventListener('click', () => {
        filtersForm.reset();
        updateSubjects();
        hasSearched = false;
        results.replaceChildren();
        resultCount.textContent = initialInstructions;
      });
      app.setAttribute('aria-busy', 'false');
      resultCount.textContent = initialInstructions;
    } catch (error) {
      showError('Please reload this page and try again. The catalogue is unavailable or could not be read.');
      console.error('Past Question Papers catalogue error:', error);
    }
  };

  loadCatalogue();
})();
