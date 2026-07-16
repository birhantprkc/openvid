"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function TermsPage() {
    const t = useTranslations("terms");
    const locale = useLocale();

    const lastUpdatedDate = new Date().toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="min-h-screen bg-[#09090B] py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <nav aria-label="Breadcrumb" className="mb-12">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm text-white/60 hover:text-white mb-8 transition-colors"
                        aria-label={t("backToHome")}
                    >
                        <Icon icon="lucide:arrow-left" width="16" className="mr-2" aria-hidden="true" />
                        {t("backToHome")}
                    </Link>
                </nav>
                <header className="mb-12">
                    <h1 className="text-3xl md:text-4xl font-semibold text-white mb-3">
                        {t("title")}
                    </h1>
                    <p className="text-white/60 text-sm">
                        {t("lastUpdated", { date: lastUpdatedDate })}
                    </p>
                </header>

                <main className="space-y-10 text-white/70 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-medium text-white mb-4">
                            1. {t("acceptance.title")}
                        </h2>
                        <p>{t("acceptance.content")}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-white mb-4">
                            2. {t("description.title")}
                        </h2>
                        <p className="mb-3">{t("description.content")}</p>
                        <ul className="list-disc list-inside space-y-2 ml-2">
                            {(t.raw("description.items") as string[]).map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-white mb-4">
                            3. {t("account.title")}
                        </h2>
                        <p className="mb-3">{t("account.content")}</p>
                        <ul className="list-disc list-inside space-y-2 ml-2 mb-3">
                            {(t.raw("account.items") as string[]).map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                        <p className="text-sm italic">{t("account.note")}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-white mb-4">
                            4. {t("acceptable.title")}
                        </h2>
                        <p className="mb-3">{t("acceptable.content")}</p>
                        <ul className="list-disc list-inside space-y-2 ml-2">
                            {(t.raw("acceptable.items") as string[]).map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-white mb-4">
                            5. {t("intellectual.title")}
                        </h2>
                        <p>{t("intellectual.content")}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-white mb-4">
                            6. {t("limitation.title")}
                        </h2>
                        <p className="mb-3">{t("limitation.content")}</p>
                        <ul className="list-disc list-inside space-y-2 ml-2">
                            {(t.raw("limitation.items") as string[]).map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-white mb-4">
                            7. {t("modifications.title")}
                        </h2>
                        <p>{t("modifications.content")}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-white mb-4">
                            8. {t("law.title")}
                        </h2>
                        <p>{t("law.content")}</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-medium text-white mb-4">
                            9. {t("contact.title")}
                        </h2>
                        <p>{t("contact.content")}</p>
                    </section>
                </main>

                <footer className="mt-16 pt-8 border-t border-white/10">
                    <p className="text-sm text-white/60">
                        {t.rich("acceptance2.content", {
                            privacy: (chunks) => (
                                <Link
                                    href="/privacy"
                                    className="text-white hover:underline transition-colors"
                                >
                                    {chunks}
                                </Link>
                            ),
                        })}
                    </p>
                </footer>
            </div>
        </div>
    );
}