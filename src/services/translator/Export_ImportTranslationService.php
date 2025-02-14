<?php
/**
 * Translations for Craft plugin for Craft CMS 3.x
 *
 * Translations for Craft eliminates error prone and costly copy/paste workflows for launching human translated Craft CMS web content.
 *
 * @link      http://www.acclaro.com/
 * @copyright Copyright (c) 2018 Acclaro
 */

namespace acclaro\translations\services\translator;

use craft\elements\Asset;
use craft\elements\Category;
use craft\elements\GlobalSet;

use acclaro\translations\Translations;
use acclaro\translations\elements\Order;
use acclaro\translations\models\FileModel;

class Export_ImportTranslationService implements TranslationServiceInterface
{
    /**
     * @var \acclaro\translations\services\api\AcclaroApiClient
     */
    protected $apiClient;

    /**
     * @var boolean
     */
    protected $sandboxMode = false;

    /**
     * @param array $settings
     */
    public function __construct(
        array $settings
    ) {
        $this->sandboxMode = !empty($settings['sandboxMode']);
    }

    /**
     * {@inheritdoc}
     */
    public function authenticate()
    {
        return;
    }

    /**
     * {@inheritdoc}
     */
    public function updateOrder(Order $order)
    {
        $newStatus = Translations::$plugin->orderRepository->getNewStatus($order);
        if ($order->status !== $newStatus) {
			$order->status = $newStatus;
            $order->logActivity(
                sprintf(Translations::$plugin->translator->translate('app', 'Order status changed to \'%s\''), $order->getStatusLabel())
            );

        }
        $order->status = $newStatus;
    }

    /**
     * {@inheritdoc}
     */
    public function updateFile(Order $order, FileModel $file){
        return;
    }

    public function updateIOFile(Order $order, FileModel $file)
    {
        $target = $file->target;
        $file->dateDelivered = new \DateTime();

        $element = Translations::$plugin->elementRepository->getElementById($file->elementId, $file->sourceSite);

        if ($element->getIsDraft()) $element = $element->getCanonical();

        switch (true) {
            case $element instanceof Asset:
                $elementRepository = Translations::$plugin->assetDraftRepository;
                break;
            case $element instanceof Category:
                $elementRepository = Translations::$plugin->categoryRepository;
                break;
            case $element instanceof GlobalSet:
                $elementRepository = Translations::$plugin->globalSetDraftRepository;
                break;
            default:
                $elementRepository = Translations::$plugin->draftRepository;
        }

        $draft = $elementRepository->getDraftById($file->draftId, $file->targetSite);

        return $this->updateDraft($element, $draft, $target, $file->sourceSite, $file->targetSite, $order);
    }

    public function updateDraft($element, $draft, $translatedContent, $sourceSite, $targetSite, $order)
    {
        // Get the data from the XML files
        $targetData = Translations::$plugin->elementTranslator->getTargetData($translatedContent);

        switch (true) {
            // Update GlobalSet Drafts
            case $draft instanceof GlobalSet:
                $draft->siteId = $targetSite;

                // $element->siteId = $targetSite;
                $post = Translations::$plugin->elementTranslator->toPostArrayFromTranslationTarget($element, $sourceSite, $targetSite, $targetData);

                $draft->setFieldValues($post);

                $res = Translations::$plugin->globalSetDraftRepository->saveDraft($draft, $post);
                if (!$res) {
                    $order->logActivity(
                        sprintf(Translations::$plugin->translator->translate('app', 'Unable to save draft, please review your XML for entry [%s]'), $element->title)
                    );

                    return false;
                }
                break;
            // Update Asset Drafts
            case $draft instanceof Asset:
                $draft->title = isset($targetData['title']) ? $targetData['title'] : $draft->title;
                $draft->siteId = $targetSite;

                $post = Translations::$plugin->elementTranslator->toPostArrayFromTranslationTarget($element, $sourceSite, $targetSite, $targetData);

                $draft->setFieldValues($post);

                $res = Translations::$plugin->assetDraftRepository->saveDraft($draft, $post);
                if (!$res) {
                    $order->logActivity(
                        sprintf(Translations::$plugin->translator->translate('app', 'Unable to save draft, please review your XML for entry [%s]'), $element->title)
                    );

                    return false;
                }
                break;
            default:
                $draft->title = isset($targetData['title']) ? $targetData['title'] : $draft->title;
                $draft->slug = isset($targetData['slug']) ? $targetData['slug'] : $draft->slug;

                /** Use source entry as first argument as the draft in target site might have different block structure as compared to source leading into missing some blocks */
                $post = Translations::$plugin->elementTranslator->toPostArrayFromTranslationTarget($element, $sourceSite, $targetSite, $targetData);
                $draft->setFieldValues($post);
                $draft->siteId = $targetSite;

                $res = Translations::$plugin->draftRepository->saveDraft($draft);
                if ($res !== true) {
                    if (is_array($res)) {
                        $errorMessage = '';
                        foreach ($res as $r) {
                            $errorMessage .= implode('; ', $r);
                        }
                        $order->logActivity(
                            Translations::$plugin->translator->translate('app', 'Error saving drafts content. Error: ' . $errorMessage)
                        );
                    } else {
                        $order->logActivity(
                            sprintf(Translations::$plugin->translator->translate('app', 'Unable to save draft, please review your XML for entry [%s]'), $element->title)
                        );
                    }

                    return false;
                }
        }

        return true;
    }

    /**
     * {@inheritdoc}
     */
    public function sendOrder(Order $order)
    {
        return;
    }

    public function editOrderName(Order $order, $name)
    {

        $order->title = $name;

        return true;
    }
}
